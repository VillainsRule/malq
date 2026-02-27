import laravelCommons from './_constructor';

export default class tempmailbank$com extends laravelCommons {
    domain = 'tempmailbank.com';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'tempmail_bank_session';
    isFormData = false;
}