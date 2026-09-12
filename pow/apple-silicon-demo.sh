#!/bin/bash

mkdir -p /tmp/pow
cd /tmp/pow

cat > sha256.metal << 'EOF'
#include <metal_stdlib>
using namespace metal;

constant uint K[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

uint rotr(uint x, uint n) { return (x >> n) | (x << (32 - n)); }
uint ch(uint e, uint f, uint g) { return (e & f) ^ (~e & g); }
uint maj(uint a, uint b, uint c) { return (a & b) ^ (a & c) ^ (b & c); }
uint ep0(uint a) { return rotr(a,2) ^ rotr(a,13) ^ rotr(a,22); }
uint ep1(uint e) { return rotr(e,6) ^ rotr(e,11) ^ rotr(e,25); }
uint sig0(uint x) { return rotr(x,7) ^ rotr(x,18) ^ (x>>3); }
uint sig1(uint x) { return rotr(x,17) ^ rotr(x,19) ^ (x>>10); }

void sha256(thread uchar *data, uint len, thread uint *out) {
    uint state[8] = {
        0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
        0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    };

    auto process_block = [&](thread uint *w) {
        for (int i = 16; i < 64; i++)
            w[i] = sig1(w[i-2]) + w[i-7] + sig0(w[i-15]) + w[i-16];

        uint a=state[0],b=state[1],c=state[2],d=state[3];
        uint e=state[4],f=state[5],g=state[6],h=state[7];

        for (int i = 0; i < 64; i++) {
            uint t1 = h + ep1(e) + ch(e,f,g) + K[i] + w[i];
            uint t2 = ep0(a) + maj(a,b,c);
            h=g; g=f; f=e; e=d+t1;
            d=c; c=b; b=a; a=t1+t2;
        }

        state[0]+=a; state[1]+=b; state[2]+=c; state[3]+=d;
        state[4]+=e; state[5]+=f; state[6]+=g; state[7]+=h;
    };

    uint w[64];

    for (int i = 0; i < 16; i++) w[i] = 0;
    uint block1_len = len < 64 ? len : 64;
    for (uint i = 0; i < block1_len; i++)
        w[i/4] |= ((uint)data[i]) << (24 - (i%4)*8);

    if (len < 56) {
        w[len/4] |= 0x80u << (24 - (len%4)*8);
        w[15] = len * 8;
        process_block(w);
    } else if (len < 64) {
        w[len/4] |= 0x80u << (24 - (len%4)*8);
        process_block(w);

        for (int i = 0; i < 16; i++) w[i] = 0;
        w[15] = len * 8;
        process_block(w);
    } else {
        process_block(w);

        for (int i = 0; i < 16; i++) w[i] = 0;
        uint rem = len - 64;
        for (uint i = 0; i < rem; i++)
            w[i/4] |= ((uint)data[64+i]) << (24 - (i%4)*8);

        if (rem < 56) {
            w[rem/4] |= 0x80u << (24 - (rem%4)*8);
            w[15] = len * 8;
            process_block(w);
        } else {
            w[rem/4] |= 0x80u << (24 - (rem%4)*8);
            process_block(w);

            for (int i = 0; i < 16; i++) w[i] = 0;
            w[15] = len * 8;
            process_block(w);
        }
    }

    for (int i = 0; i < 8; i++) out[i] = state[i];
}

struct SolverParams {
    uint challenge_len;
    uint target_len;
    uint base_nonce;
    uint padding;
};

kernel void pow_solver(
    constant uchar *challenge      [[ buffer(0) ]],
    constant uchar *target         [[ buffer(1) ]],
    constant SolverParams &params  [[ buffer(2) ]],
    device atomic_uint *found      [[ buffer(3) ]],
    device uint *result_nonce      [[ buffer(4) ]],
    uint tid                       [[ thread_position_in_grid ]]
) {
    if (atomic_load_explicit(found, memory_order_relaxed)) return;

    uint nonce = params.base_nonce + tid;
    uchar input[128];
    uint clen = params.challenge_len;

    for (uint i = 0; i < clen; i++) input[i] = challenge[i];
    input[clen] = ':';

    char tmp[12];
    int nlen = 0;
    uint n = nonce;
    if (n == 0) { tmp[nlen++] = '0'; }
    else { while (n > 0) { tmp[nlen++] = '0' + (n % 10); n /= 10; } }
    for (int i = 0; i < nlen; i++) input[clen + 1 + i] = tmp[nlen - 1 - i];

    uint total_len = clen + 1 + nlen;

    uint hash[8];
    sha256(input, total_len, hash);

    uchar hex[64];
    for (int w = 0; w < 8; w++) {
        for (int b = 0; b < 4; b++) {
            uchar byte = (hash[w] >> (24 - b*8)) & 0xff;
            uchar hi = byte >> 4;
            uchar lo = byte & 0xf;
            hex[(w*4+b)*2]   = hi < 10 ? '0'+hi : 'a'+(hi-10);
            hex[(w*4+b)*2+1] = lo < 10 ? '0'+lo : 'a'+(lo-10);
        }
    }

    for (uint i = 0; i < params.target_len; i++) {
        if (hex[i] != target[i]) return;
    }

    if (atomic_fetch_add_explicit(found, 1, memory_order_relaxed) == 0)
        *result_nonce = nonce;
}
EOF

cat > main.swift << 'EOF'
import Metal
import Foundation

let args = CommandLine.arguments
guard args.count == 3 else {
    fputs("usage: pow <challenge> <target>\n", stderr)
    exit(1)
}

let challenge = args[1]
let target = args[2]

let device = MTLCreateSystemDefaultDevice()!
let queue = device.makeCommandQueue()!

let src = try! String(contentsOfFile: "sha256.metal", encoding: .utf8)
let lib = try! device.makeLibrary(source: src, options: nil)
let fn = lib.makeFunction(name: "pow_solver")!
let pipeline = try! device.makeComputePipelineState(function: fn)

let challengeBytes = [UInt8](challenge.utf8)
let targetBytes = [UInt8](target.utf8)

let challengeBuf = device.makeBuffer(bytes: challengeBytes, length: challengeBytes.count, options: .storageModeShared)!
let targetBuf = device.makeBuffer(bytes: targetBytes, length: targetBytes.count, options: .storageModeShared)!

struct SolverParams {
    var challenge_len: UInt32
    var target_len: UInt32
    var base_nonce: UInt32
    var padding: UInt32
}

let foundBuf = device.makeBuffer(length: 4, options: .storageModeShared)!
let resultBuf = device.makeBuffer(length: 4, options: .storageModeShared)!
foundBuf.contents().storeBytes(of: UInt32(0), as: UInt32.self)

let batchSize = 1_048_576
var baseNonce: UInt64 = 0
let start = Date()

while true {
    var params = SolverParams(
        challenge_len: UInt32(challengeBytes.count),
        target_len: UInt32(targetBytes.count),
        base_nonce: UInt32(baseNonce & 0xFFFFFFFF),
        padding: 0
    )
    let paramsBuf = device.makeBuffer(bytes: &params, length: MemoryLayout<SolverParams>.size, options: .storageModeShared)!

    let cmd = queue.makeCommandBuffer()!
    let enc = cmd.makeComputeCommandEncoder()!
    enc.setComputePipelineState(pipeline)
    enc.setBuffer(challengeBuf, offset: 0, index: 0)
    enc.setBuffer(targetBuf, offset: 0, index: 1)
    enc.setBuffer(paramsBuf, offset: 0, index: 2)
    enc.setBuffer(foundBuf, offset: 0, index: 3)
    enc.setBuffer(resultBuf, offset: 0, index: 4)

    let threadsPerGroup = MTLSize(width: pipeline.maxTotalThreadsPerThreadgroup, height: 1, depth: 1)
    let groups = MTLSize(width: batchSize / pipeline.maxTotalThreadsPerThreadgroup, height: 1, depth: 1)
    enc.dispatchThreadgroups(groups, threadsPerThreadgroup: threadsPerGroup)
    enc.endEncoding()
    cmd.commit()
    cmd.waitUntilCompleted()

    let found = foundBuf.contents().load(as: UInt32.self)
    if found > 0 {
        let nonce = resultBuf.contents().load(as: UInt32.self)
        let elapsed = Date().timeIntervalSince(start) * 1000
        fputs("Solved in \(String(format: "%.2f", elapsed))ms (\(nonce) hashes)\n", stderr)
        print(nonce)
        exit(0)
    }

    baseNonce += UInt64(batchSize)
}
EOF

swiftc -O -o pow main.swift -framework Metal -framework Foundation
printf "Compiled!\n\n"

RESPONSE=$(curl -s http://localhost:4400/api/v1/demo/challenge)
CHALLENGE=$(echo "$RESPONSE" | grep -o '"challenge":"[^"]*"' | cut -d'"' -f4)
TARGET=$(echo "$RESPONSE" | grep -o '"target":"[^"]*"' | cut -d'"' -f4)

echo "Challenge: $CHALLENGE"
printf "Target: $TARGET\n\n"

NONCE=$(./pow "$CHALLENGE" "$TARGET")
printf "Nonce: $NONCE\n\n"

RESULT=$(curl -s -X POST http://localhost:4400/api/v1/demo/verify \
  -H "Content-Type: application/json" \
  -d "{\"challenge\":\"$CHALLENGE\",\"nonce\":\"$NONCE\"}")

echo "$RESULT"