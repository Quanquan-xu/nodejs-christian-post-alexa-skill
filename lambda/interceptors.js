const Alexa = require('ask-sdk-core');
// i18n dependency
const i18n = require('i18next');
const languageStrings = require('./localisation');
const constants = require('./constants');
const logic = require('./logic');

// This request interceptor will log all incoming requests to this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};

// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

// This request interceptor will bind a translation function 't' to the handlerInput
// Additionally it will handle picking a random value if instead of a string it receives an array
const LocalisationRequestInterceptor = {
    process(handlerInput) {
        const localisationClient = i18n.init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings,
            returnObjects: true
        });
        localisationClient.localise = function localise() {
            const args = arguments;
            const value = i18n.t(...args);
            if (Array.isArray(value)) {
                return value[Math.floor(Math.random() * value.length)];
            }
            return value;
        };
        handlerInput.t = function translate(...args) {
            return localisationClient.localise(...args);
        }
    }
};


const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        if(Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.')) return;
        const sessionAttributes = attributesManager.getSessionAttributes();
        // the "loaded" check is because the "new" session flag is lost if there's a one shot utterance that hits an intent with auto-delegate
        if (Alexa.isNewSession(requestEnvelope) || !sessionAttributes['loaded']){ //is this a new session? not loaded from db?
            let persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            if (Object.keys(persistentAttributes).length === 0) {
                persistentAttributes = {
                  playbackSetting: {
                    loop: false,
                    shuffle: false,
                  },
                  playbackInfo: {
                    index: 0,
                    offsetInMilliseconds: 0,
                    playbackIndexChanged: true,
                    token: '',
                    nextStreamEnqueued: false,
                    inPlaybackSession: true,
                    hasPreviousPlaybackSession: false,
                  },
                  history:{
                      resume:false,
                      episodes:{}
                  }
                }
            }
            if(!persistentAttributes['updatedAt'] || persistentAttributes['updatedAt'] < ( Date.now() - 4 * 1000 * 3600)){
              const newSessionAttributes = await logic.fetchLastestEposides(persistentAttributes['playlist']);
              persistentAttributes = Object.assign(persistentAttributes, newSessionAttributes)

            }
            console.log('Loading from persistent storage: ' + JSON.stringify(persistentAttributes));
            persistentAttributes['loaded'] = true;
            persistentAttributes['history']['resume'] = false;
            //copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes); // ALL persistent attributtes are now session attributes
        }
    }
};

// If you disable the skill and reenable it the userId might change and you loose the persistent attributes saved below as userId is the primary key
const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        if (!response) return; // avoid intercepting calls that have no outgoing response due to errors
        const {attributesManager, requestEnvelope} = handlerInput;
        if(Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.')){
             await attributesManager.savePersistentAttributes();
             return;
        }
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); //is this a session end?
        // the "loaded" check is because the session "new" flag is lost if there's a one shot utterance that hits an intent with auto-delegate
        const loadedThisSession = sessionAttributes['loaded'];
        if ((shouldEndSession || Alexa.getRequestType(requestEnvelope) === 'SessionEndedRequest') && loadedThisSession) { // skill was stopped or timed out
            // we increment a persistent session counter here
            sessionAttributes['sessionCounter'] = sessionAttributes['sessionCounter'] ? sessionAttributes['sessionCounter'] + 1 : 1;
            const episodes = Object.keys(sessionAttributes['history']['episodes'] || {}).reverse();
            if (episodes.length > 10){
                for (let i = 10; i < episodes.length; i++) {
                    const episode = episodes[i]
                    delete sessionAttributes['history']['episodes'][episode];
                }
            }
            // limiting save of session attributes to the ones we want to make persistent
            for (var key in sessionAttributes) {
                if (!constants.PERSISTENT_ATTRIBUTES_NAMES.includes(key))
                    delete sessionAttributes[key];
                }
            console.log('Saving to persistent storage:' + JSON.stringify(sessionAttributes));
            attributesManager.setPersistentAttributes(sessionAttributes);
        }
        await attributesManager.savePersistentAttributes();
    }
};

module.exports = {
    LoggingRequestInterceptor,
    LoggingResponseInterceptor,
    LocalisationRequestInterceptor,
    LoadAttributesRequestInterceptor,
    SaveAttributesResponseInterceptor
}
