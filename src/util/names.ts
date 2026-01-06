const lastNameReq = await fetch('https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Usernames/Names/familynames-usa-top1000.txt');
const lastNameRes = await lastNameReq.text();
const lastNameList = lastNameRes.toLowerCase().split('\n').map(n => n.trim()).filter(n => n.length > 0);

const firstNameReq = await fetch('https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Usernames/Names/malenames-usa-top1000.txt');
const firstNameRes = await firstNameReq.text();
const firstNameList = firstNameRes.toLowerCase().split('\n').map(n => n.trim()).filter(n => n.length > 0);

export const getRandomName = () => {
    const firstName = firstNameList[Math.floor(Math.random() * firstNameList.length)];
    const lastName = lastNameList[Math.floor(Math.random() * lastNameList.length)];

    return firstName + lastName;
}