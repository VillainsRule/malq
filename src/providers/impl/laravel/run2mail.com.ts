import laravelCommons from './_constructor';

export default class run2mail$com extends laravelCommons {
    domain = 'run2mail.com';
    messageEndpoint = 'en/get_messages';
    domainPage = '/';
    customLaravelCookie = 't_mail_session';
    isFormData = false;
    utcOffset = 1;
}