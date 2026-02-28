import laravelCommons from './_constructor';

export default class emailgenerator$email extends laravelCommons {
    domain = 'emailgenerator.email';
    messageEndpoint = 'get_messages';
    customLaravelCookie = 'email_generator_session';
    isFormData = false;
}