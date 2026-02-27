import laravelCommons from './_constructor';

export default class edumail$biz extends laravelCommons {
    domain = 'edumail.biz';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'edumail_session';
    isFormData = false;
}