const Alexa = require('ask-sdk-core');
const constants = require('./constants');
const util = require('./util'); // utility functions
const logic = require('./logic');

// playlist and contents logic handlers

const SayListIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SayList';
  },
  handle(handlerInput) {
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

      }else if (queryName.toLowerCase().includes("lastest episode") || queryName.toLowerCase().includes("promotion")) {
            const playlist = sessionAttributes['playlist'];
            const episodes = sessionAttributes['lastestEposides'];
            messages = util.getSayPromotionEpisodesMessages(episodes, playlist, handlerInput);
      }else{
            const playlist = sessionAttributes['playlist']
            messages = util.getSayPlaylistMessages(playlist, handlerInput);
      }
      handlerInput.responseBuilder.withStandardCard(
          messages.cardTitle,
          messages.cardSubtitle,
          constants.IMAGES.standardCardSmallImageUrl,
          constants.IMAGES.standardCardLargeImageUrl
      );
      return handlerInput.responseBuilder
          .speak(util.speakSafeText(messages.message))
          .reprompt(util.getResponseMessage('REPROMPT_MSG'))
          .getResponse();
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
  handle(handlerInput) {
    const {attributesManager, requestEnvelope} = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const channels = sessionAttributes['recommendedChannels'];
    sessionAttributes['isSearchedChannels'] = false
    let messages = {};
    messages = util.getSayChannelsMessages(channels,handlerInput);
      handlerInput.responseBuilder.withStandardCard(
          messages.cardTitle,
          messages.cardSubtitle,
          constants.IMAGES.standardCardSmallImageUrl,
          constants.IMAGES.standardCardLargeImageUrl
      );
      return handlerInput.responseBuilder
          .speak(util.speakSafeText(messages.message))
          .reprompt(util.getResponseMessage('REPROMPT_MSG'))
          .getResponse();
    }
};
const PlayChannelIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayChannel';
  },
  async handle(handlerInput) {
    const {attributesManager, requestEnvelope, responseBuilder} = handlerInput;
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
                const description = `check channel ${channelName} lastest episodes! `;
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
        return responseBuilder
          .speak(util.getResponseMessage('INDEX_ERROR_MSG',{name:"channel", number: channelNum}))
          .reprompt(util.getResponseMessage('REPROMPT_MSG'))
          .getResponse();
    }
    return responseBuilder
      .speak(util.getResponseMessage('API_ERROR_MSG'))
      .reprompt(util.getResponseMessage('REPROMPT_MSG'))
      .getResponse();
    }
};
const PlayEpisodeIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayEpisode';
  },
  async handle(handlerInput) {
    const {requestEnvelope, responseBuilder} = handlerInput;
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
            return responseBuilder
              .speak(util.getResponseMessage('INDEX_ERROR_MSG',{name:"episode", number: episodeNum}))
              .reprompt(util.getResponseMessage('REPROMPT_MSG'))
              .getResponse();
        }
    }
    return responseBuilder
      .speak(util.getResponseMessage('ERROR_MSG'))
      .reprompt(util.getResponseMessage('REPROMPT_MSG'))
      .getResponse();
    }
};
const PlayPromotionEpisodesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPromotionEpisodes';
  },
  async handle(handlerInput) {
    const {attributesManager, requestEnvelope, responseBuilder} = handlerInput;
    const {lastestEposides, playbackInfo} = attributesManager.getSessionAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();
    const {playlistTokens} = util.setPlaylist("episode", "promotion episodes", lastestEposides, sessionAttributes)
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

            handlerInput.responseBuilder.withStandardCard(
                cardTitle,
                cardSubtitle,
                constants.IMAGES.standardCardSmallImageUrl,
                constants.IMAGES.standardCardLargeImageUrl
            );

            return handlerInput.responseBuilder
                .speak(util.speakSafeText(message))
                .reprompt(util.getResponseMessage('REPROMPT_MSG'))
                .getResponse();
        }
        return handlerInput.responseBuilder
            .speak(util.getResponseMessage('SEARCH_CONFIRMATION_REJECTED_MSG', {name: requestScope ? requestScope : "channels or episodes"}))
            .reprompt(util.getResponseMessage('REPROMPT_MSG'))
            .getResponse();
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
          const offsetInMilliseconds = 0;
          Object.assign(history["episodes"], {[token]:0});

          const {subtitle} = util.getDescriptionSubtitleMessage(podcast, playlist);
          const backgroundImage = constants.IMAGES["backgroundImage"]
          const metadata = {
            title: podcast.title,
            subtitle: subtitle,
            art: new Alexa.ImageHelper().addImageInstance(podcast.imageUrl).getImage(),
            backgroundImage: new Alexa.ImageHelper().addImageInstance(backgroundImage).getImage()
          }
          responseBuilder.addAudioPlayerPlayDirective(
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
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPodcast';
    }

    if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PlayCommandIssued') {
      return true;
    }

    if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest') {
      return Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPodcast' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent';
    }
  },
  handle(handlerInput) {
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
        playbackInfo.index = 0;
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
    } else if (!playbackInfo.inPlaybackSession) {
        const episode = playlist['episodes'][playlistTokens[playbackInfo.index]];
        const {description, subtitle} = util.getDescriptionSubtitleMessage(episode, playlist);
        message += util.getResponseMessage('HELP_IN_LISENING_MSG', {description: description});
    } else {
      const isSaySample = (Math.floor(Math.random() * 10) + 1) >= 8;
      let also = '';
      if(isSaySample){
        message += util.getResponseMessage('HELP_IN_COMING_BACK_SAMPLE_MSG');
        also = 'also';
      }
      message += util.getResponseMessage('HELP_IN_QUESTION_MSG',{also: also, number1:(Math.floor(Math.random() * 10) + 1), number2: (Math.floor(Math.random() * 10) + 1)});
    }
    handlerInput.responseBuilder.withStandardCard(
      message,
      "",
      constants.IMAGES.standardCardSmallImageUrl,
      constants.IMAGES.standardCardLargeImageUrl
    );
    return handlerInput.responseBuilder
      .speak(util.speakSafeText(message))
      .reprompt(util.speakSafeText(message))
      .getResponse();
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
    console.log("history-offsetInMilliseconds", history['episodes'])
    
    if(history['episodes'][token] && history['episodes'][token] > 30000){
        
        history.resume = true;
        playbackInfo.offsetInMilliseconds = parseInt(history['episodes'][token]) - 5000;
        console.log("offsetInMilliseconds", token)
        console.log("offsetInMilliseconds", history['episodes'][token])
        return util.getResumeMessageResponse(podcast,playlist,handlerInput)
    }

    playbackInfo.nextStreamEnqueued = false;

    const {description,subtitle} = util.getDescriptionSubtitleMessage(podcast, playlist);

    let message = util.getResponseMessage('START_PLAYING_MSG', {description: description});
    if(index % 5 === 0 && (!sessionCounter || sessionCounter % 10 === 0)){
        message = message + util.getResponseMessage('START_PLAYING_HELP_MSG')
    }

    const backgroundImage = constants.IMAGES["backgroundImage"]
    const metadata = {
        title: podcast.title,
        subtitle: subtitle,
        art: new Alexa.ImageHelper().addImageInstance(podcast.imageUrl).getImage(),
        backgroundImage: new Alexa.ImageHelper().addImageInstance(backgroundImage).getImage()
    }
    const cardTitle = description;

    const cardSubtitle = util.getResponseMessage('START_PLAYING_HELP_MSG');
    responseBuilder.withStandardCard(
        cardTitle,
        util.getResponseMessage('START_PLAYING_HELP_MSG'),
        constants.IMAGES.standardCardSmallImageUrl,
        constants.IMAGES.standardCardLargeImageUrl
    );
    responseBuilder
      .speak(util.speakSafeText(message))
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(playBehavior, podcast.audioUrl, token, offsetInMilliseconds, null,metadata);
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
