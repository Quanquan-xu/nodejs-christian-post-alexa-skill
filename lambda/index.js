
/* *
 * By The Christian Post.
 * The earth shall be full of the knowledge of the Lord as the waters cover the sea! Isaiah 11:9
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
    audioPlayerHandlers.AudioPlayerEventHandler,
    normalHandlers.LaunchRequestHandler,
    audioPlayerHandlers.HelpHandler,
    audioPlayerHandlers.SayListIntentHandler,
    audioPlayerHandlers.SayRecommendedChannelsHandler,
    audioPlayerHandlers.SearchIntentHandler,
    audioPlayerHandlers.PlayChannelIntentHandler,
    audioPlayerHandlers.PlayEpisodeIntentHandler,
    audioPlayerHandlers.PlayFeaturedEpisodesIntentHandler,
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
    normalHandlers.SessionEndedRequestHandler,
    normalHandlers.SystemExceptionHandler,
    normalHandlers.FallbackIntentHandler,
    normalHandlers.IntentReflectorHandler
  )
  .addErrorHandlers(normalHandlers.ErrorHandler)
  .addRequestInterceptors(
    interceptors.LoadAttributesRequestInterceptor,
    interceptors.LoggingRequestInterceptor
  )
  .addResponseInterceptors(
    interceptors.LoggingResponseInterceptor,
    interceptors.SaveAttributesResponseInterceptor,
  )
  .withPersistenceAdapter(util.getPersistenceAdapter())
  .withApiClient(new Alexa.DefaultApiClient())
  .withCustomUserAgent('sample/hello-world/v1.2')
  .lambda();


  /* *
 * STANDARD FOOTER:
 * The earth shall be full of the knowledge of the Lord as the waters cover the sea! Isaiah 11:9
 * */
