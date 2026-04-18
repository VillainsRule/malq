import laravelCommons from './_constructor';

export default class quickmails$eu extends laravelCommons {
    domain = 'quickmails.eu';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'quickmails_session';
    isFormData = false;
}