import laravelCommons from './_constructor';

export default class tempmailplus$com extends laravelCommons {
    domain = 'tempmail-plus.com';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'temp_mail_plus_session';
    isFormData = false;
    utcOffset = 1;
}