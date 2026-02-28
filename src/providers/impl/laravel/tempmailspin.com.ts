import laravelCommons from './_constructor';

export default class tempmailspin$com extends laravelCommons {
    domain = 'tempmailspin.com';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'tempmail_spin_session';
    isFormData = false;
}