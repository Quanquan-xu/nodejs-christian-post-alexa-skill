
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
    normalHandlers.LaunchRequestHandler,
    audioPlayerHandlers.SayListIntentHandler,
    audioPlayerHandlers.SayRecommendedChannelsHandler,
    audioPlayerHandlers.SaySearchResultIntentHandler,
    audioPlayerHandlers.PlayChannelIntentHandler,
    audioPlayerHandlers.PlayEpisodeIntentHandler,
    audioPlayerHandlers.PlayPromotionEpisodesIntentHandler,
    audioPlayerHandlers.HelpHandler,
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
    audioPlayerHandlers.ExitHandler,
    audioPlayerHandlers.AudioPlayerEventHandler,
    normalHandlers.SessionEndedRequestHandler,
    normalHandlers.SystemExceptionHandler,
    normalHandlers.FallbackIntentHandler,
    normalHandlers.IntentReflectorHandler
  )
  .addRequestInterceptors(
    interceptors.LoadAttributesRequestInterceptor,
    interceptors.LocalisationRequestInterceptor,
    interceptors.LoggingRequestInterceptor
  )
  .addResponseInterceptors(
    interceptors.LoggingResponseInterceptor,
    interceptors.SaveAttributesResponseInterceptor,
    interceptors.SavePersistentAttributesResponseInterceptor
  )
  .withPersistenceAdapter(util.getPersistenceAdapter())
  .addErrorHandlers(normalHandlers.ErrorHandler)
  .withCustomUserAgent('sample/hello-world/v1.2')
  .lambda();
