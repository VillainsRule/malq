import laravelCommons from './_constructor';

export default class throwaway$io extends laravelCommons {
    domain = 'throwaway.io';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'throwawayio_session';
    isFormData = false;
}