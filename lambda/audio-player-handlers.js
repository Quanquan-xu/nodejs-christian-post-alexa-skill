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
      if(queryName.toLowerCase().includes("channel")){
          let channels = sessionAttributes['recommendedChannels'];
          // if(!channels){
          //   channels = constants.recommendedChannels
          // }
          let message = 'Here are ten recommended channels: '
          channels.forEach(function(channel, index) {
            message += 'channel ' + (index + 1) + " : " + channel.title + ";  "
          });
          message += handlerInput.t('LIST_NOTIFICATION_MSG', {name: "channel"})
          return handlerInput.responseBuilder
          .speak(message)
          .reprompt(handlerInput.t('REPROMPT_MSG'))
          .getResponse();
      }else if (queryName.toLowerCase().includes("lastest episode")) {
            const playlist = sessionAttributes['playlist']
            const episodes = sessionAttributes['lastestEposides']
            let message = 'Here are lastest episodes: ';
            if(playlist['type'] === 'channel'){
              message = `Here are lastest episodes, you can say alexa, play lastest episodes to change your playlist: `
            }else{
              message = 'Here are lastest episodes, also in your playlist: '
            }
            Object.values(episodes).forEach(function(episode, index) {
              message += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
            });
            if(playlist['type'] === 'channel'){
              message += handlerInput.t('LIST_NOTIFICATION_MSG', {name: "episode"})
            }
            return handlerInput.responseBuilder
            .speak(message)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
      }else{
            const playlist = sessionAttributes['playlist']
            const episodes = playlist['episodes'];
            let message;
            if(playlist['type'] === 'channel'){
              message = `Here are your playlist from lastest episodes of channel ${playlist['name']}: `
            }else{
              message = 'Here are your playlist from lastest episodes: '
            }
            Object.values(episodes).forEach(function(episode, index) {
              message += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
            });
            message += handlerInput.t('LIST_NOTIFICATION_MSG', {name: "episode"})
            return handlerInput.responseBuilder
            .speak(message)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
      }
    }
    return handlerInput.responseBuilder
      .speak(handlerInput.t('REJECTED_MSG'))
      .reprompt(handlerInput.t('REPROMPT_MSG'))
      .getResponse();
    }
};

const PlayChannelIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayChannel';
  },
  async handle(handlerInput) {
    const {attributesManager, requestEnvelope, responseBuilder} = handlerInput;
    const {recommendedChannels} = attributesManager.getSessionAttributes();
    const channelNum = Alexa.getSlotValue(requestEnvelope, 'number');

    if(channelNum){
      const index = parseInt(channelNum) - 1;
      const chosenChannel = recommendedChannels[index]
      const channelID = chosenChannel['id']
      const channelName = chosenChannel['title']


      try {
            await util.callDirectiveService(handlerInput, handlerInput.t('PROGRESSIVE_MSG', {channel: channelName}));
      } catch (error) {
          // if it fails we can continue, but the user will wait without progressive response
          console.log("Progressive response directive error : " + error);
      }

      const playlistTokens = await logic.fetchChannelEposides(channelID,attributesManager);
      if(playlistTokens){
          const playbackInfo = await util.getPlaybackInfo(handlerInput);
          playbackInfo.index = 0;
          playbackInfo.offsetInMilliseconds = 0;
          playbackInfo.playbackIndexChanged = true;
          playbackInfo.hasPreviousPlaybackSession = false;
          playbackInfo.playOrder = playlistTokens;
          return controller.play(handlerInput);
      }
    }
    return responseBuilder
      .speak(handlerInput.t('API_ERROR_MSG'))
      .reprompt(handlerInput.t('REPROMPT_MSG'))
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
      const index = parseInt(channelNum) - 1;
      const playbackInfo = await util.getPlaybackInfo(handlerInput);
      playbackInfo.index = index;
      playbackInfo.offsetInMilliseconds = 0;
      playbackInfo.playbackIndexChanged = true;
      playbackInfo.hasPreviousPlaybackSession = true;
      return controller.play(handlerInput);
    }
    return responseBuilder
      .speak(handlerInput.t('DEVELOPING_MSG'))
      .reprompt(handlerInput.t('REPROMPT_MSG'))
      .getResponse();
    }
};

const PlayLastestEpisodesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayLastestEpisodes';
  },
  async handle(handlerInput) {
    const {attributesManager, requestEnvelope, responseBuilder} = handlerInput;
    const pastor = Alexa.getSlotValue(requestEnvelope, 'pastor');
    const channel = Alexa.getSlotValue(requestEnvelope, 'channel');

    if(!pastor && !channel){
      const {lastestEposides} = attributesManager.getSessionAttributes();
      const newSessionAttributes = {};
      newSessionAttributes['playlist'] = {
          type: "episodes",
          name: "lastest episodes",
          episodes:lastestEposides
      }
      const playlistTokens = Object.keys(lastestEposides);
      newSessionAttributes['playlistTokens'] = playlistTokens
      newSessionAttributes['playlistLength'] = playlistTokens.length
      attributesManager.setSessionAttributes(newSessionAttributes);
      const playbackInfo = await util.getPlaybackInfo(handlerInput);
      playbackInfo.index = 0;
      playbackInfo.offsetInMilliseconds = 0;
      playbackInfo.playbackIndexChanged = true;
      playbackInfo.hasPreviousPlaybackSession = false;
      playbackInfo.playOrder = playlistTokens;
      return controller.play(handlerInput);
    }
    return responseBuilder
      .speak(handlerInput.t('DEVELOPING_MSG'))
      .reprompt(handlerInput.t('REPROMPT_MSG'))
      .getResponse();
    }
};

// baisc audio player handlers
const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.');
  },
  async handle(handlerInput) {
    const {
      requestEnvelope,
      attributesManager,
      responseBuilder
    } = handlerInput;
    const audioPlayerEventName = Alexa.getRequestType(requestEnvelope).split('.')[1];
    const {
      playbackSetting,
      playbackInfo
    } = await attributesManager.getPersistentAttributes();

    const {
      playlist,
      playlistLength
    } = await attributesManager.getSessionAttributes();

    switch (audioPlayerEventName) {
      case 'PlaybackStarted':
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.inPlaybackSession = true;
        playbackInfo.hasPreviousPlaybackSession = true;
        break;
      case 'PlaybackFinished':
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        playbackInfo.nextStreamEnqueued = false;
        break;
      case 'PlaybackStopped':
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.offsetInMilliseconds = getOffsetInMilliseconds(handlerInput);
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

          const enqueueToken = playbackInfo.playOrder[enqueueIndex];
          const playBehavior = 'ENQUEUE';
          const podcast = playlist['episodes'][playbackInfo.playOrder[enqueueIndex]];
          const expectedPreviousToken = playbackInfo.token;
          const offsetInMilliseconds = 0;

          responseBuilder.addAudioPlayerPlayDirective(
            playBehavior,
            podcast.url,
            enqueueToken,
            offsetInMilliseconds,
            expectedPreviousToken,
          );
          break;
        }
      case 'PlaybackFailed':
        playbackInfo.inPlaybackSession = false;
        console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
        return;
      default:
        throw new Error('Should never reach here!');
    }

    return responseBuilder.getResponse();
  },
};

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

const StartPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);
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

    const playbackInfo = await util.getPlaybackInfo(handlerInput);
    return !playbackInfo.inPlaybackSession && (Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.NextCommandIssued' ||
        (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent'));
  },
  handle(handlerInput) {
    return controller.playNext(handlerInput);
  },
};


const PreviousPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      (Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PreviousCommandIssued' ||
        (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PreviousIntent'));
  },
  handle(handlerInput) {
    return controller.playPrevious(handlerInput);
  },
};

const PausePlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
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
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOnIntent';
  },
  async handle(handlerInput) {
    const playbackSetting = await handlerInput.attributesManager.getPersistentAttributes().playbackSetting;

    playbackSetting.loop = true;

    return handlerInput.responseBuilder
      .speak('Loop turned on.')
      .getResponse();
  },
};

const LoopOffHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOffIntent';
  },
  async handle(handlerInput) {
    const playbackSetting = await handlerInput.attributesManager.getPersistentAttributes().playbackSetting;

    playbackSetting.loop = false;

    return handlerInput.responseBuilder
      .speak('Loop turned off.')
      .getResponse();
  },
};

const ShuffleOnHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOnIntent';
  },
  async handle(handlerInput) {
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    playbackSetting.shuffle = true;
    playbackInfo.playOrder = await shuffleOrder(handlerInput);
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return controller.play(handlerInput);
  },
};

const ShuffleOffHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOffIntent';
  },
  async handle(handlerInput) {
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    const {
      playlistTokens
    } = handlerInput.attributesManager.getSessionAttributes();

    if (playbackSetting.shuffle) {
      playbackSetting.shuffle = false;
      playbackInfo.index = playbackInfo.playOrder[playbackInfo.index];
      playbackInfo.playOrder = playlistTokens;
    }

    return controller.play(handlerInput);
  },
};

const StartOverHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent';
  },
  async handle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    playbackInfo.offsetInMilliseconds = 0;

    return controller.play(handlerInput);
  },
};

const YesHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return !playbackInfo.inPlaybackSession && Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    return controller.play(handlerInput);
  },
};

const NoHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return !playbackInfo.inPlaybackSession && Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
  },
  async handle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    playbackInfo.index = 0;
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
    const playbackInfo = await util.getPlaybackInfo(handlerInput);
    let message;
    const {
      playlist
    } = handlerInput.attributesManager.getSessionAttributes();

    if (!playbackInfo.hasPreviousPlaybackSession) {
      message = handlerInput.t('HELP_IN_INIT_MSG') ;
    } else if (!playbackInfo.inPlaybackSession) {
      message = handlerInput.t('HELP_IN_COMING_BACK_MSG', {description: playlist['episodes'][playbackInfo.playOrder[playbackInfo.index]].title});
    } else {
      message = handlerInput.t('HELP_IN_LISENING_MSG');
    }

    return handlerInput.responseBuilder
      .speak(message)
      .reprompt(message)
      .getResponse();
  },
};

const ExitHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await util.getPlaybackInfo(handlerInput);

    return !playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    const message = handlerInput.t('GOODBYE_MSG');
    return handlerInput.responseBuilder
      .speak(message)
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

    const playbackInfo = await util.getPlaybackInfo(handlerInput);
    const {
      playOrder,
      offsetInMilliseconds,
      index
    } = playbackInfo;

    const {
      playlist,
      playlistTokens
    } = handlerInput.attributesManager.getSessionAttributes();

    const playBehavior = 'REPLACE_ALL';
    const token = playlistTokens[index];
    const podcast = playlist['episodes'][token];
    playbackInfo.nextStreamEnqueued = false;

    let description = podcast.title;
    let subtitle;
    if(playlist['type'] ==="channel"){
      description = description + " from  channel " + playlist['name'];
      subtitle = playlist['name'];
    }
    if(playlist['type'] ==="episodes"){
      description = description + " from " + playlist['name']
      //const subtitle = await logic.fetchChannelNameByEpisodeID(token)
      subtitle = playlist['name'].charAt(0).toUpperCase() + playlist['name'].slice(1) ;
    }
    const message = handlerInput.t('START_PLAYING_MSG', {description: description});
    const backgroundImage = constants.images["backgroundImage"]
    const metadata = {
        title: podcast.title,
        subtitle: subtitle,
        art: new Alexa.ImageHelper().addImageInstance(podcast.imageUrl).getImage(),
        backgroundImage: new Alexa.ImageHelper().addImageInstance(backgroundImage).getImage()
    }
    responseBuilder
      .speak(message)
      //.withShouldEndSession(true)
      .addAudioPlayerPlayDirective(playBehavior, podcast.audioUrl, token, offsetInMilliseconds, null,metadata);

    if (await canThrowCard(handlerInput)) {
      const cardTitle = `Playing ${podcast.title}`;
      const cardContent = `Playing ${podcast.title}`;
      responseBuilder.withSimpleCard(cardTitle, cardContent);
    }
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
    } = await handlerInput.attributesManager.getPersistentAttributes();

    const {
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
    } = await handlerInput.attributesManager.getPersistentAttributes();

    const {
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

function getToken(handlerInput) {
  // Extracting token received in the request.
  return handlerInput.requestEnvelope.request.token;
}

async function canThrowCard(handlerInput) {

  const playbackInfo = await util.getPlaybackInfo(handlerInput);

  if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && playbackInfo.playbackIndexChanged) {
    playbackInfo.playbackIndexChanged = false;
    return true;
  }
  return false;
}

async function getIndex(handlerInput) {
  // Extracting index from the token received in the request.
  const tokenValue = parseInt(handlerInput.requestEnvelope.request.token, 10);
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();

  return attributes.playbackInfo.playOrder.indexOf(tokenValue);
}

function getOffsetInMilliseconds(handlerInput) {
  // Extracting offsetInMilliseconds received in the request.
  return handlerInput.requestEnvelope.request.offsetInMilliseconds;
}

function shuffleOrder(handlerInput) {

  const {
    playlistTokens,
    playlistLength
  } = handlerInput.attributesManager.getSessionAttributes();

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
    PlayChannelIntentHandler,
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
