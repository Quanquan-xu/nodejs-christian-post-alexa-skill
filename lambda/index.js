
/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const util = require('./util'); // utility functions
const interceptors = require('./interceptors');
const normalHandlers = require('./normal-handlers');
const audioPlayerHandlers = require('./audio-player-handlers');


const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    audioPlayerHandlers.CheckAudioInterfaceHandler,
    audioPlayerHandlers.SayListIntentHandler,
    audioPlayerHandlers.PlayChannelIntentHandler,
    normalHandlers.LaunchRequestHandler,
    audioPlayerHandlers.HelpHandler,
    normalHandlers.SystemExceptionHandler,
    normalHandlers.SessionEndedRequestHandler,
    audioPlayerHandlers.YesHandler,
    audioPlayerHandlers.NoHandler,
    audioPlayerHandlers.StartPlaybackHandler,
    audioPlayerHandlers.NextPlaybackHandler,
    audioPlayerHandlers.PreviousPlaybackHandler,
    audioPlayerHandlers.PausePlaybackHandler,
    audioPlayerHandlers.LoopOnHandler,
    audioPlayerHandlers.LoopOffHandler,
    audioPlayerHandlers.ShuffleOnHandler,
    audioPlayerHandlers.ShuffleOffHandler,
    audioPlayerHandlers.StartOverHandler,
    normalHandlers.ExitHandler,
    audioPlayerHandlers.AudioPlayerEventHandler,
    audioPlayerHandlers.CancelAndStopIntentHandler,
    normalHandlers.FallbackIntentHandler,
    normalHandlers.IntentReflectorHandler
  )
  .addRequestInterceptors(
    interceptors.LoadPersistentAttributesRequestInterceptor,
    interceptors.LocalisationRequestInterceptor,
    interceptors.LoggingRequestInterceptor
  )
  .addResponseInterceptors(
    interceptors.LoggingResponseInterceptor,
    interceptors.SavePersistentAttributesResponseInterceptor
  )
  .withPersistenceAdapter(util.getPersistenceAdapter())
  .addErrorHandlers(normalHandlers.ErrorHandler)
  .withCustomUserAgent('sample/hello-world/v1.2')
  .lambda();
