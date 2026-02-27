import laravelCommons from './_constructor';

export default class email10min$com extends laravelCommons {
    domain = 'email10min.com';
    messageEndpoint = 'messages';
    customLaravelCookie = '10minutemail_session';
    isFormData = true;
}