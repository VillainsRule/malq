import laravelCommons from './_constructor';

export default class tempmailg$com extends laravelCommons {
    domain = 'tempmailg.com';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'tempmailg_session';
    isFormData = false;
}