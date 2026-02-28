import laravelCommons from './_constructor';

export default class temp_mail$africa extends laravelCommons {
    domain = 'temp-mail.africa';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'temp_mail_session';
    isFormData = false;
}