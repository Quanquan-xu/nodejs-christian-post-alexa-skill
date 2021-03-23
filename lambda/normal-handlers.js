const Alexa = require('ask-sdk-core');
const constants = require('./constants'); // constants such as specific service permissions go here
const util = require('./util'); // utility functions

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const {playbackInfo,playlistTokens,playlist,history} = handlerInput.attributesManager.getSessionAttributes();
    let message;
    let reprompt;

    if (!playbackInfo.hasPreviousPlaybackSession) {
        message = util.getResponseMessage('WELCOME_MSG');
        reprompt = util.getResponseMessage('WELCOME_MSG_REPROMPT');
    } else {
        playbackInfo.inPlaybackSession = false;
        const episodes = playlist['episodes'];
        const episode = episodes[playlistTokens[playbackInfo.index]]
        const {description} = util.getDescriptionSubtitleMessage(episode, playlist);
        message = util.getResponseMessage('WELCOME_BACK_MSG', {description:description})
        reprompt = util.getResponseMessage('WELCOME_BACK_MSG_REPROMPT');
    }
    return util.formatResponseBuilder(message,reprompt,message,reprompt,handlerInput);
  },
};

/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speechText = util.getResponseMessage('FALLBACK_MSG');

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(util.getResponseMessage('REPROMPT_MSG'))
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        //console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents
 * by defining them above, then also adding them to the request handler chain below
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
        .speak(util.getResponseMessage('REPROMPT_MSG'))
        //.reprompt(util.getResponseMessage('REPROMPT_MSG'))
        .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below
 * */

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speechText = util.getResponseMessage('ERROR_MSG');
        //console.log(`~~~~ Error handled: ${JSON.stringify(handlerInput)}`);
        //console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);
        console.log(`~~~~ Error handled: ${error.toString()}`);

        return handlerInput.responseBuilder
            //.speak(error.toString())
            //.reprompt(util.getResponseMessage('REPROMPT_MSG'))
            .getResponse();
    }
};



const SystemExceptionHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'System.ExceptionEncountered';
  },
  handle(handlerInput) {
    console.log(`System exception encountered: ${handlerInput.requestEnvelope.request.reason}`);
  },
};



module.exports = {
    LaunchRequestHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
    ErrorHandler,
    SystemExceptionHandler
}
