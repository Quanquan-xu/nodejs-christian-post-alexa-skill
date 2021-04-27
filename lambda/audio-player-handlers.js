const Alexa = require('ask-sdk-core');
const constants = require('./constants');
const util = require('./util'); // utility functions
const logic = require('./logic');


// playlist and contents logic handlers

const SayListIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SayList';
  },
  async handle(handlerInput) {
      
    await logic.checkUpdateLatestResources(handlerInput);
    
    const {attributesManager, requestEnvelope} = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const queryName = Alexa.getSlotValue(requestEnvelope, 'queryName');
    if(queryName){
      let messages = {};
      if(queryName.toLowerCase().includes("channel")){
          const channels = sessionAttributes['recommendedChannels'];
          const searchedChannels = sessionAttributes['searchedChannels'];
          if(searchedChannels){
            messages = util.getSayChannelsMessages(searchedChannels,handlerInput,true);
            sessionAttributes['isSearchedChannels'] = true
          }else{
            messages = util.getSayChannelsMessages(channels,handlerInput);
            sessionAttributes['isSearchedChannels'] = false
          }

      }else if (queryName.toLowerCase().includes("latest episode") || queryName.toLowerCase().includes("promotion") || queryName.toLowerCase().includes("feature")) {
            const playlist = sessionAttributes['playlist'];
            const episodes = sessionAttributes['lastestEposides'];
            messages = util.getSayPromotionEpisodesMessages(episodes, playlist, handlerInput);
      }else{
            const playlist = sessionAttributes['playlist']
            messages = util.getSayPlaylistMessages(playlist, handlerInput);
      }
      const reprompt = util.getResponseMessage('REPROMPT_MSG');
      return util.formatResponseBuilder(messages.cardTitle, messages.cardSubtitle, messages.message, reprompt, handlerInput);
    }
    return handlerInput.responseBuilder
      .speak(util.getResponseMessage('ERROR_MSG'))
      .reprompt(util.getResponseMessage('REPROMPT_MSG'))
      .getResponse();
    }
};
const SayRecommendedChannelsHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SayRecommendedChannels';
  },
  async handle(handlerInput) {
      
    await logic.checkUpdateLatestResources(handlerInput);
    
    const {attributesManager, requestEnvelope} = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const channels = sessionAttributes['recommendedChannels'];
    sessionAttributes['isSearchedChannels'] = false
    let messages = {};
    messages = util.getSayChannelsMessages(channels,handlerInput);
    
    const reprompt = util.getResponseMessage('REPROMPT_MSG');
    return util.formatResponseBuilder(messages.cardTitle, messages.cardSubtitle, messages.message, reprompt, handlerInput);
    }
};
const PlayChannelIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayChannel';
  },
  async handle(handlerInput) {
      
    await logic.checkUpdateLatestResources(handlerInput);
    
    const {attributesManager, requestEnvelope} = handlerInput;
    const {recommendedChannels,searchedChannels,isSearchedChannels} = attributesManager.getSessionAttributes();
    const channelNum = Alexa.getSlotValue(requestEnvelope, 'number');
    let availableChannels = recommendedChannels;
    if(isSearchedChannels){
        availableChannels = searchedChannels;
    }
    if(channelNum){
        const index = parseInt(channelNum) - 1;
        if(index <= availableChannels.length - 1){
            const chosenChannel = availableChannels[index]
            const channelID = chosenChannel['id']
            const channelName = chosenChannel['title']
            try {
                const description = `check channel ${channelName} latest episodes! `;
                await util.callDirectiveService(handlerInput, util.getResponseMessage('PROGRESSIVE_MSG', {description: description}));
            } catch (error) {
              // if it fails we can continue, but the user will wait without progressive response
              console.log("Progressive response directive error : " + error);
            }
            const playlistTokens = await logic.fetchChannelEposides(channelID,attributesManager.getSessionAttributes());
            if(playlistTokens.length > 0){
                const { playbackInfo } = attributesManager.getSessionAttributes();
                playbackInfo.index = 0;
                playbackInfo.offsetInMilliseconds = 0;
                playbackInfo.playbackIndexChanged = true;
                playbackInfo.hasPreviousPlaybackSession = false;
                return controller.play(handlerInput);
            }
        }
        const message = util.getResponseMessage('INDEX_ERROR_MSG',{name:"channel", number: channelNum});
        const reprompt = util.getResponseMessage('REPROMPT_MSG');
        return util.formatResponseBuilder(message, reprompt, message, reprompt, handlerInput);
    }
    const message = util.getResponseMessage('API_ERROR_MSG');
    const reprompt = util.getResponseMessage('REPROMPT_MSG');
    return util.formatResponseBuilder(message, reprompt, message, reprompt, handlerInput);
    }
};

const PlayEpisodeIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayEpisode';
  },
  async handle(handlerInput) {
    
    await logic.checkUpdateLatestResources(handlerInput, true);
    
    const {requestEnvelope} = handlerInput;
    const episodeNum = Alexa.getSlotValue(requestEnvelope, 'number');

    if(episodeNum){
        const index = parseInt(episodeNum) - 1;
        const {playbackInfo, playlistLength} = handlerInput.attributesManager.getSessionAttributes();
        if(index <= playlistLength - 1){
            playbackInfo.index = index;
            playbackInfo.offsetInMilliseconds = 0;
            playbackInfo.playbackIndexChanged = true;
            playbackInfo.hasPreviousPlaybackSession = true;
            return controller.play(handlerInput);
        }else{
            const message =util.getResponseMessage('INDEX_ERROR_MSG',{name:"episode", number: episodeNum});
            const reprompt = util.getResponseMessage('REPROMPT_MSG');
            return util.formatResponseBuilder(message, reprompt, message, reprompt, handlerInput);
        }
    }
    const message = util.getResponseMessage('API_ERROR_MSG');
    const reprompt = util.getResponseMessage('REPROMPT_MSG');
    return util.formatResponseBuilder(message, reprompt, message, reprompt, handlerInput);
    }
};

const PlayPromotionEpisodesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPromotionEpisodes';
  },
  async handle(handlerInput) {
      
    await logic.checkUpdateLatestResources(handlerInput);
    
    const {attributesManager, requestEnvelope, responseBuilder} = handlerInput;
    const {lastestEposides, playbackInfo} = attributesManager.getSessionAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();
    const {playlistTokens} = util.setPlaylist("episode", "featured episodes", lastestEposides, sessionAttributes)
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    playbackInfo.hasPreviousPlaybackSession = false;
    return controller.play(handlerInput);
  }
};

const SaySearchResultIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaySearchResult'||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'SayEpisodesSearchResult' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'SayChannelsSearchResult');
    },
    async handle(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;
        let requestScope = "";
        if(Alexa.getIntentName(handlerInput.requestEnvelope) ==='SayEpisodesSearchResult' ){
            requestScope = "episodes"
        }
        if(Alexa.getIntentName(handlerInput.requestEnvelope) ==='SayChannelsSearchResult' ){
            requestScope = "channels"
        }
        if (intent.confirmationStatus === 'CONFIRMED') {
            await logic.checkUpdateLatestResources(handlerInput, true);
            let scope = Alexa.getSlotValue(requestEnvelope, 'scope');
            const keywords = Alexa.getSlotValue(requestEnvelope, 'keywords');
            if(requestScope){
                scope = requestScope;
            }
            try {
                const description = `search ${scope} about ${keywords} ...`;
                await util.callDirectiveService(handlerInput, util.getResponseMessage('PROGRESSIVE_MSG', {description: description}));
            } catch (error) {
                console.log("Progressive response directive error : " + error);
            }

            const {message, cardTitle, cardSubtitle} = await logic.fetchSearchResults(keywords,scope,handlerInput);
            const reprompt = util.getResponseMessage('REPROMPT_MSG');
            return util.formatResponseBuilder(cardTitle, cardSubtitle, message, reprompt, handlerInput);
        }
        const message = util.getResponseMessage('SEARCH_CONFIRMATION_REJECTED_MSG', {name: requestScope ? requestScope : "channels or episodes"});
        const reprompt = util.getResponseMessage('REPROMPT_MSG');
        return util.formatResponseBuilder(message, reprompt, message, reprompt, handlerInput);
    }
};

// baisc audio player handlers

const CheckAudioInterfaceHandler = {
  async canHandle(handlerInput) {
    const audioPlayerInterface = ((((handlerInput.requestEnvelope.context || {}).System || {}).device || {}).supportedInterfaces || {}).AudioPlayer;
    return audioPlayerInterface === undefined
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Sorry, this skill is not supported on this device')
      .withShouldEndSession(true)
      .getResponse();
  },
};

const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.');
  },
  async handle(handlerInput) {
    const {
      attributesManager,
      requestEnvelope,
      responseBuilder
    } = handlerInput;

    const audioPlayerEventName = Alexa.getRequestType(requestEnvelope).split('.')[1];
    const {
      playbackSetting,
      playbackInfo,
      playlist,
      playlistTokens,
      playlistLength,
      history
    } = await attributesManager.getPersistentAttributes()

    const token = handlerInput.requestEnvelope.request.token;
    let index = playlistTokens.indexOf(token)
    if(index < 0){
        index = playlistTokens.indexOf(parseInt(token, 10))
    }
    const offsetInMilliseconds = handlerInput.requestEnvelope.request.offsetInMilliseconds;
    switch (audioPlayerEventName) {
      case 'PlaybackStarted':
        playbackInfo.token = token ;
        playbackInfo.index = index;
        playbackInfo.inPlaybackSession = true;
        playbackInfo.hasPreviousPlaybackSession = true;
        break;
      case 'PlaybackFinished':
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        playbackInfo.nextStreamEnqueued = false;
        Object.assign(history["episodes"], {[token]:0})
        break;
      case 'PlaybackStopped':
        playbackInfo.token = token;
        playbackInfo.index = index;
        playbackInfo.offsetInMilliseconds = offsetInMilliseconds;
        playbackInfo.inPlaybackSession = false;
        Object.assign(history["episodes"], {[token]:offsetInMilliseconds})
        break;
      case 'PlaybackNearlyFinished':
        {
          if (playbackInfo.nextStreamEnqueued) {
            break;
          }
          const enqueueIndex = (playbackInfo.index + 1) % playlistLength;

          if (enqueueIndex === 0 && !playbackSetting.loop) {
            break;
          }
          playbackInfo.nextStreamEnqueued = true;

          const enqueueToken = playlistTokens[enqueueIndex];
          const playBehavior = 'ENQUEUE';
          const podcast = playlist['episodes'][enqueueToken];
          const expectedPreviousToken = playbackInfo.token;

          const {metadata} = util.getResponseMetadata(podcast,playlist,1,1)

          let offsetInMilliseconds = 0;
        //   let historyOffsetInMilliseconds = history["episodes"][enqueueToken]
        //   if(historyOffsetInMilliseconds && parseInt(historyOffsetInMilliseconds) >= 6000){
        //       offsetInMilliseconds = parseInt(historyOffsetInMilliseconds) - 5000;
        //   }
          responseBuilder
            .addAudioPlayerPlayDirective(
              playBehavior,
              podcast.audioUrl,
              enqueueToken,
              offsetInMilliseconds,
              expectedPreviousToken,
              metadata
            );
          break;
        }
      case 'PlaybackFailed':
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        Object.assign(history["episodes"], {[token]:offsetInMilliseconds})
        console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
        return;
      default:
        throw new Error('Should never reach here!');
    }
    return responseBuilder.getResponse();
  },
};

const StartPlaybackHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    if (!playbackInfo.inPlaybackSession) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPodcast' || Alexa.getIntentName(handlerInput.requestEnvelope) ==='AMAZON.ResumeIntent');
    }

    if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PlayCommandIssued') {
      return true;
    }

    if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest') {
      return Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPodcast' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent';
    }
  },
  async handle(handlerInput) {
      
    await logic.checkUpdateLatestResources(handlerInput, true);
    
    return controller.play(handlerInput);
  },
};

const NextPlaybackHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession && (Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.NextCommandIssued' ||
        (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent'));
  },
  handle(handlerInput) {
    return controller.playNext(handlerInput);
  },
};


const PreviousPlaybackHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession && (Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PreviousCommandIssued' ||
        (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PreviousIntent'));
  },
  handle(handlerInput) {
    return controller.playPrevious(handlerInput);
  },
};

const PausePlaybackHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession && Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent');
  },
  handle(handlerInput) {
    return controller.stop(handlerInput);
  },
};

const LoopOnHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOnIntent';
  },
  async handle(handlerInput) {
    const {playbackSetting} = handlerInput.attributesManager.getSessionAttributes();
    playbackSetting.loop = true;

    return handlerInput.responseBuilder
      .speak('Loop turned on.')
      .getResponse();
  },
};

const LoopOffHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOffIntent';
  },
  async handle(handlerInput) {
    const {playbackSetting} = handlerInput.attributesManager.getSessionAttributes();

    playbackSetting.loop = false;

    return handlerInput.responseBuilder
      .speak('Loop turned off.')
      .getResponse();
  },
};

const ShuffleOnHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOnIntent';
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const {
      playbackInfo,
      playbackSetting,
      playlistTokens,
      playlistLength
    } = sessionAttributes ;

    playbackSetting.shuffle = true;
    sessionAttributes['playlistTokens'] = await shuffleOrder(playlistTokens, playlistLength);
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return controller.play(handlerInput);
  },
};

const ShuffleOffHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOffIntent';
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const {
      playbackInfo,
      playbackSetting,
      playlistTokens,
      playlist
    } = sessionAttributes ;

    if (playbackSetting.shuffle) {
        const  originalPlaylistTokens = Object.keys(playlist['episodes']);
        const newIndex = originalPlaylistTokens.indexOf([playlistTokens[playbackInfo.index]]);
        playbackSetting.shuffle = false;
        playbackInfo.index = newIndex >= 0 ? newIndex: 0;
        sessionAttributes['playlistTokens'] = originalPlaylistTokens;
    }
    return controller.play(handlerInput);
  },
};

const StartOverHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent';
  },
  async handle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    playbackInfo.offsetInMilliseconds = 0;
    return controller.play(handlerInput);
  },
};

const YesHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo,history} = handlerInput.attributesManager.getSessionAttributes();
    return (!playbackInfo.inPlaybackSession || history.resume) && Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const {playbackInfo, history} = handlerInput.attributesManager.getSessionAttributes();
    util.removeResumeHistoryEpisode(playbackInfo, history)
    return controller.play(handlerInput);
  },
};

const NoHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo, history} = handlerInput.attributesManager.getSessionAttributes();
    return (!playbackInfo.inPlaybackSession || history.resume) && Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
  },
  async handle(handlerInput) {
    const {playbackInfo, history} = handlerInput.attributesManager.getSessionAttributes();
    if(!history.resume){
        playbackInfo.inPlaybackSession = true
        return util.getStartResumeNoResponse(handlerInput)
    }
    util.removeResumeHistoryEpisode(playbackInfo, history)
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    playbackInfo.hasPreviousPlaybackSession = false;

    return controller.play(handlerInput);
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  async handle(handlerInput) {
    const {
      playbackInfo,
      playlist,
      playlistTokens,
      sessionCounter
    } = handlerInput.attributesManager.getSessionAttributes();

    let message = '';

    if (!playbackInfo.hasPreviousPlaybackSession && (!sessionCounter || sessionCounter % 7 === 0)) {
        message += util.getResponseMessage('BUILT_IN_HELP_WEL_VERSE') + util.getResponseMessage('HELP_IN_QUESTION_MSG',{number1:(Math.floor(Math.random() * 10) + 1), number2: (Math.floor(Math.random() * 10) + 1)});
        message += util.getResponseMessage('HELP_IN_SEARCH_MSG');
    } else if (!playbackInfo.inPlaybackSession && (sessionCounter % 3 === 0)) {
        const episode = playlist['episodes'][playlistTokens[playbackInfo.index]];
        const {description, subtitle} = util.getDescriptionSubtitleMessage(episode, playlist);
        message += util.getResponseMessage('HELP_IN_LISENING_MSG', {description: description});
    } else {
      message += util.getResponseMessage('HELP_IN_QUESTION_MSG',{number1:(Math.floor(Math.random() * 10) + 1), number2: (Math.floor(Math.random() * 10) + 1)});
      message += util.getResponseMessage('HELP_IN_SEARCH_MSG');
    }
    
    return util.formatResponseBuilder(message, "", message, message, handlerInput);
  },
};

const ExitHandler = {
  async canHandle(handlerInput) {
    const {playbackInfo} = handlerInput.attributesManager.getSessionAttributes();
    return !playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    const message = util.getResponseMessage('GOODBYE_MSG');
    return handlerInput.responseBuilder
      .speak(util.speakSafeText(message))
      .withShouldEndSession(true)
      .getResponse();
  },
};


/* HELPER FUNCTIONS */


const controller = {
  async play(handlerInput) {
    const {
      attributesManager,
      responseBuilder
    } = handlerInput;

    const {
      playbackInfo,
      playlist,
      playlistTokens,
      history,
      sessionCounter
    } = handlerInput.attributesManager.getSessionAttributes();

    const {
      offsetInMilliseconds,
      index
    } = playbackInfo;

    const playBehavior = 'REPLACE_ALL';
    const token = playlistTokens[index];
    const podcast = playlist['episodes'][token];
    playbackInfo.token = token;
    
    const isPause = (!playbackInfo.inPlaybackSession && playbackInfo.hasPreviousPlaybackSession)

    if(!isPause && history['episodes'][token] && history['episodes'][token] > 60000){
        history.resume = true;
        playbackInfo.offsetInMilliseconds = parseInt(history['episodes'][token]) - 5000;
        return util.getResumeMessageResponse(podcast,playlist, parseInt(history['episodes'][token]), handlerInput)
    }

    playbackInfo.nextStreamEnqueued = false;

    const {message, metadata, cardTitle, cardSubtitle} = util.getResponseMetadata(podcast,playlist,index,sessionCounter)

    responseBuilder.withStandardCard(
        cardTitle,
        cardSubtitle,
        constants.IMAGES.standardCardSmallImageUrl,
        constants.IMAGES.standardCardLargeImageUrl
    );
    if(!isPause && !history.resume){
        responseBuilder.speak(util.speakSafeText(message));
    }
    history.resume = false
    responseBuilder
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(playBehavior, podcast.audioUrl, token, offsetInMilliseconds, null, metadata);
    return responseBuilder.getResponse();
  },
  stop(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .getResponse();
  },
  async playNext(handlerInput) {
    const {
      playbackInfo,
      playbackSetting,
      playlistLength
    } = handlerInput.attributesManager.getSessionAttributes();

    const nextIndex = (playbackInfo.index + 1) % playlistLength;

    if (nextIndex === 0 && !playbackSetting.loop) {
      return handlerInput.responseBuilder
        .speak('You have reached the end of the playlist')
        .addAudioPlayerStopDirective()
        .getResponse();
    }

    playbackInfo.index = nextIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return this.play(handlerInput);
  },
  async playPrevious(handlerInput) {
    const {
      playbackInfo,
      playbackSetting,
      playlistLength
    } = handlerInput.attributesManager.getSessionAttributes();

    let previousIndex = playbackInfo.index - 1;

    if (previousIndex === -1) {
      if (playbackSetting.loop) {
        previousIndex += playlistLength;
      } else {
        return handlerInput.responseBuilder
          .speak('You have reached the start of the playlist')
          .addAudioPlayerStopDirective()
          .getResponse();
      }
    }

    playbackInfo.index = previousIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;

    return this.play(handlerInput);
  },
};


function shuffleOrder(playlistTokens,playlistLength) {
  const array = playlistTokens;
  let currentIndex = playlistLength;
  let temp;
  let randomIndex;
  // Algorithm : Fisher-Yates shuffle
  return new Promise((resolve) => {
    while (currentIndex >= 1) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temp = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temp;
    }
    resolve(array);
  });
}



module.exports = {
    CheckAudioInterfaceHandler,
    HelpHandler,
    YesHandler,
    NoHandler,
    SayListIntentHandler,
    SayRecommendedChannelsHandler,
    SaySearchResultIntentHandler,
    PlayChannelIntentHandler,
    PlayEpisodeIntentHandler,
    PlayPromotionEpisodesIntentHandler,
    StartPlaybackHandler,
    NextPlaybackHandler,
    PreviousPlaybackHandler,
    PausePlaybackHandler,
    LoopOnHandler,
    LoopOffHandler,
    ShuffleOnHandler,
    ShuffleOffHandler,
    StartOverHandler,
    ExitHandler,
    AudioPlayerEventHandler
}
