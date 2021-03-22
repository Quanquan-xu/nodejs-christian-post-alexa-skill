const AWS = require('aws-sdk');
const i18n = require('i18next');
const languageStrings = require('./localisation');
const constants = require('./constants');


const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4'
});

const localisationClient = i18n.init({
    lng: 'en-US',
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

module.exports = {
    getS3PreSignedUrl(s3ObjectKey) {
        const bucketName = process.env.S3_PERSISTENCE_BUCKET;
        const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: s3ObjectKey,
            Expires: 60*1 // the Expires is capped for 1 minute
        });
        console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
        return s3PreSignedUrl;
    },
    getPersistenceAdapter(tableName) {
        // This function is an indirect way to detect if this is part of an Alexa-Hosted skill
        function isAlexaHosted() {
            return process.env.S3_PERSISTENCE_BUCKET;
        }
        if (isAlexaHosted()) {
            const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
            return new S3PersistenceAdapter({
                bucketName: process.env.S3_PERSISTENCE_BUCKET
            });
        } else {
            // IMPORTANT: don't forget to give DynamoDB access to the role you're using to run this lambda (via IAM policy)
            const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
            return new DynamoDbPersistenceAdapter({
                tableName: tableName || 'edifi_podcast',
                createTable: true
            });
        }
    },
    callDirectiveService(handlerInput, msg) {
        // Call Alexa Directive Service.
        const {requestEnvelope} = handlerInput;
        const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
        const requestId = requestEnvelope.request.requestId;
        const {apiEndpoint, apiAccessToken} = requestEnvelope.context.System;
        // build the progressive response directive
        const directive = {
            header: {
                requestId
            },
            directive:{
                type: 'VoicePlayer.Speak',
                speech: msg
            }
        };
        // send directive
        return directiveServiceClient.enqueue(directive, apiEndpoint, apiAccessToken);
    },
    supportsAPL(handlerInput) {
        const {supportedInterfaces} = handlerInput.requestEnvelope.context.System.device;
        return !!supportedInterfaces['Alexa.Presentation.APL'];
    },
    speakSafeText: function(input) {
        if (input && (input.includes("&") || input.includes("<") || input.includes(">"))) {
            return input.toString().replace(/&#39;/g, "'").replace(/&/g, 'and').replace(/</g,"'").replace(/>/g,"'");
        }
        return input;
    },
    getSayChannelsMessages(channels, handlerInput, isFromSearch=false, notFirstTime=true){
        let message, cardTitle, cardSubtitle;
        const length = channels.length;
        const maxLength = length >= 10 ? 10 : length;
        const number = (Math.floor(Math.random() * maxLength) + 1);
        const isNotificationFrist = (number >= maxLength -3);

        if(isFromSearch){
            message = handlerInput.t('LIST_RESULTS_NOTIFICATION_MSG_HEADER_FRO_SEARCH',{length:maxLength, name:"channels", last: notFirstTime ? " last ":" "});
        }else{
            message = handlerInput.t('LIST_RECOMMANDED_CHANNELS_NOTIFICATION_MSG_HEADER',{length:maxLength});
        }

        cardTitle = ''
        channels.forEach(function(channel, index) {
            cardTitle += 'Channel ' + (index + 1) + " : " + channel.title + ";  "
        });
        cardSubtitle = handlerInput.t('LIST_PROMPT_NOTIFICATION_MSG',{name:"channel", number:number});

        if(isNotificationFrist){
            message += cardSubtitle;
        }

        message += cardTitle;
        if(!isNotificationFrist){
            message += cardSubtitle;
        }

        return {message, cardTitle, cardSubtitle}
    },
    getSayPlaylistMessages(playlist,handlerInput){
        let message, cardTitle, cardSubtitle;
        const episodes = playlist['episodes'];
        const length = Object.keys(episodes).length;
        const maxLength = length >= 10 ? 10 : length;
        const number = (Math.floor(Math.random() * maxLength) + 1);
        const isNotificationFrist = (number >= maxLength - 3);

        message = '';
        cardTitle = ''
        cardSubtitle = handlerInput.t('LIST_PROMPT_NOTIFICATION_MSG',{name:"episode", number:number});

        if(playlist['type'] === 'channel'){
            message = handlerInput.t('LIST_PLAYLIST_NOTIFICATION_MSG_HEADER_FRO_CHANNEL', {length:maxLength, name:playlist['name']})
            Object.values(episodes).forEach(function(episode, index) {
                cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
            });
        }else{
            if(playlist['name'].includes("promotion")){
                message = handlerInput.t('LIST_PLAYLIST_NOTIFICATION_MSG_HEADER_FRO_PROMOTION', {length:maxLength})
                Object.values(episodes).forEach(function(episode, index) {
                    cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
                });
            }else if (playlist['name'].includes("search")) {
                message = handlerInput.t('LIST_RESULTS_NOTIFICATION_MSG_HEADER_FRO_SEARCH',{length:maxLength, name:"episodes"});
                Object.values(episodes).forEach(function(episode, index) {
                    cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + " from channel " + episode.channelName +";  "
                });
            }else{
                message = handlerInput.t('LIST_PLAYLIST_NOTIFICATION_MSG_HEADER_FRO_EPISODES', {length:maxLength})
                Object.values(episodes).forEach(function(episode, index) {
                    cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
                });
            }
        }

        if(isNotificationFrist){
            message += cardSubtitle;
        }
        if(maxLength > 5){
            message += handlerInput.t('LIST_ONLY_TOP_FIVE_NOTIFICATION_MSG',{name:""});
        }
        if(playlist['type'] === 'episode' && playlist['name'].includes("search")){
            Object.values(episodes).filter( (ele,index) => index < 5 ).forEach(function(episode, index) {
                message += 'Episode ' + (index + 1) + " : " + episode.title + " from channel " + episode.channelName +";  "
            });
        }else{
            Object.values(episodes).filter( (ele,index) => index < 5 ).forEach(function(episode, index) {
                message += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
            });
        }

        if(!isNotificationFrist){
            message += cardSubtitle;
        }
        return {message, cardTitle, cardSubtitle}
    },
    getSayPromotionEpisodesMessages(episodes,playlist,handlerInput){
        let message, cardTitle, cardSubtitle;
        const length = Object.keys(episodes).length;
        const maxLength = length >= 10 ? 10 : length;
        const number = (Math.floor(Math.random() * maxLength) + 1);
        const isNotificationFrist = (number >= maxLength - 3);

        message = '';
        cardTitle = '';
        Object.values(episodes).forEach(function(episode, index) {
          cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
        });
        cardSubtitle = handlerInput.t('LIST_PROMPT_NOTIFICATION_MSG',{name:"episode", number:number});

        if(playlist['type'] === 'channel'){
          message = handlerInput.t('LIST_PROMOTION_EPISODES_NOTIFICATION_MSG_FOR_CHANNEL')
        }else{
          message = handlerInput.t('LIST_PROMOTION_EPISODES_NOTIFICATION_MSG_FOR_EPISODES')
          if(isNotificationFrist){
              message += cardSubtitle;
          }
        }
        if(maxLength > 5){
            message += handlerInput.t('LIST_ONLY_TOP_FIVE_NOTIFICATION_MSG',{name:"lastest promotion episodes"});
        }
        Object.values(episodes).filter( (ele,index) => index < 5 ).forEach(function(episode, index) {
          message += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
        });
        if(!isNotificationFrist && playlist['type'] !== 'channel'){
            message += cardSubtitle;
        }
        return {message, cardTitle, cardSubtitle}
    },
    setPlaylist(type,name,episodes,sessionAttributes){
        const playlist = {type,name,episodes}
        const playlistTokens = Object.keys(episodes);

        sessionAttributes['playlist'] = playlist;
        sessionAttributes['playlistTokens'] = playlistTokens;
        sessionAttributes['playlistLength'] = playlistTokens.length;

        return {playlist, playlistTokens}
    },
    getFormatedEpisode(eposide, image, channelName=""){
        return {
            [`eposide-${eposide["id"]}`]:
                {
                    id: eposide["id"],
                    title:eposide["title"],
                    imageUrl:image["base_url"]["blob"],
                    audioUrl:eposide["medium"]["src_url"],
                    publishedAt: eposide["published_at"],
                    channelName:channelName
                }
        }
    },
    getResponseMessage(...args){
        return localisationClient.localise(...args);
    },
    getResumeMessageResponse(episode,playlist,handlerInput){
        let description;
        if(playlist['type']==="channel"){
            description = episode.title + ' from channel ' + playlist['name']
        }else{
            description = episode.title + ' from ' + playlist['name']
        }
        const message = this.getResponseMessage('START_PLAYING_RESUME_MSG', {description:description})
        const reprompt = this.getResponseMessage('START_PLAYING_RESUME_MSG_REPROMPT');
        handlerInput.responseBuilder.withStandardCard(
            this.speakSafeText(message),
            reprompt,
            constants.IMAGES.standardCardSmallImageUrl,
            constants.IMAGES.standardCardLargeImageUrl
        );
        return handlerInput.responseBuilder
            .speak(this.speakSafeText(message))
            .reprompt(reprompt)
            .getResponse();
    },
    // removeResumeHistoryEpisode(playbackInfo, history){
    //     if(history.resume){
    //         const token = playbackInfo.token;
    //         const episodes = history['episodes'];
    //         if(episodes.includes(token)){
    //             delete history['episodes'][token]
    //         }
    //         history.resume = false
    //     }
    // }
}
