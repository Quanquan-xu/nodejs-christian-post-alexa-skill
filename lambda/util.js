const AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const languageStrings = require('./localisation');
const constants = require('./constants');
const logic = require('./logic');


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
            message = this.getResponseMessage('LIST_RESULTS_NOTIFICATION_MSG_HEADER_FRO_SEARCH',{length:maxLength, name:"channels", last: notFirstTime ? " last ":" "});
        }else{
            message = this.getResponseMessage('LIST_RECOMMANDED_CHANNELS_NOTIFICATION_MSG_HEADER',{length:maxLength});
        }

        cardTitle = ''
        channels.forEach(function(channel, index) {
            cardTitle += 'Channel ' + (index + 1) + " : " + channel.title + ";  "
        });
        cardSubtitle = this.getResponseMessage('LIST_PROMPT_NOTIFICATION_MSG',{name:"channel", number:number});

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
        cardSubtitle = this.getResponseMessage('LIST_PROMPT_NOTIFICATION_MSG',{name:"episode", number:number});

        if(playlist['type'] === 'channel'){
            message = this.getResponseMessage('LIST_PLAYLIST_NOTIFICATION_MSG_HEADER_FRO_CHANNEL', {length:maxLength, name:playlist['name']})
            Object.values(episodes).forEach(function(episode, index) {
                cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
            });
        }else{
            if(playlist['name'].includes("featured")){
                message = this.getResponseMessage('LIST_PLAYLIST_NOTIFICATION_MSG_HEADER_FRO_PROMOTION', {length:maxLength})
                Object.values(episodes).forEach(function(episode, index) {
                    cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
                });
            }else if (playlist['name'].includes("search")) {
                message = this.getResponseMessage('LIST_RESULTS_NOTIFICATION_MSG_HEADER_FRO_SEARCH',{length:maxLength, name:"episodes"});
                Object.values(episodes).forEach(function(episode, index) {
                    cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + " from channel " + episode.channelName +";  "
                });
            }else{
                message = this.getResponseMessage('LIST_PLAYLIST_NOTIFICATION_MSG_HEADER_FRO_EPISODES', {length:maxLength})
                Object.values(episodes).forEach(function(episode, index) {
                    cardTitle += 'Episode ' + (index + 1) + " : " + episode.title + ";  "
                });
            }
        }

        if(isNotificationFrist){
            message += cardSubtitle;
        }
        if(maxLength > 5){
            message += this.getResponseMessage('LIST_ONLY_TOP_FIVE_NOTIFICATION_MSG',{name:""});
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
        cardSubtitle = this.getResponseMessage('LIST_PROMPT_NOTIFICATION_MSG',{name:"episode", number:number});

        if(playlist['type'] === 'channel'){
          message = this.getResponseMessage('LIST_PROMOTION_EPISODES_NOTIFICATION_MSG_FOR_CHANNEL')
        }else{
          message = this.getResponseMessage('LIST_PROMOTION_EPISODES_NOTIFICATION_MSG_FOR_EPISODES')
          if(isNotificationFrist){
              message += cardSubtitle;
          }
        }
        if(maxLength > 5){
            message += this.getResponseMessage('LIST_ONLY_TOP_FIVE_NOTIFICATION_MSG',{name:"latest featured episodes"});
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
    getResponseMetadata(podcast, playlist, index, sessionCounter){
        const {description,subtitle} = this.getDescriptionSubtitleMessage(podcast, playlist);
        let message = this.getResponseMessage('START_PLAYING_MSG', {description: description});
        if(index % 5 === 0 && (!sessionCounter || sessionCounter <= 40 || sessionCounter % 7 === 0)){
            message = message + this.getResponseMessage('START_PLAYING_HELP_MSG')
        }
        const backgroundImage = constants.IMAGES["backgroundImage"]
        const metadata = {
            title: podcast.title,
            subtitle: subtitle,
            art: new Alexa.ImageHelper().addImageInstance(podcast.imageUrl).getImage(),
            backgroundImage: new Alexa.ImageHelper().addImageInstance(backgroundImage).getImage()
        }
        const cardTitle = description;
        const cardSubtitle = this.getResponseMessage('START_PLAYING_HELP_MSG');
        return {message, metadata, cardTitle, cardSubtitle}
    },
    getDescriptionSubtitleMessage(eposide,playlist){
        let description;
        let subtitle;

        if(playlist['type'] ==="channel"){
            description = eposide.title + " from  channel " + playlist['name'];
            subtitle = playlist['name'];
        }else{
            if(playlist['name'].includes("search")){
                description = eposide.title + " from " + eposide["channelName"];
                subtitle = eposide["channelName"];
            }else{
                //const subtitle = await logic.fetchChannelNameByEpisodeID(token)
                description = eposide.title + " from " + playlist['name'];
                subtitle = playlist['name'].charAt(0).toUpperCase() + playlist['name'].slice(1) ;
            }
        }
        return {description, subtitle}
    },
    getResumeMessageResponse(episode,playlist, offsetInMilliseconds, handlerInput){
        const {description} = this.getDescriptionSubtitleMessage(episode,playlist);
        const minute = parseInt(offsetInMilliseconds / 60000) ;
        const second = parseInt((offsetInMilliseconds % 60000) / 1000);
        let time = '' ;
        if(minute){
            time += `${minute} minutes `
        }
        if(second >= 10){
            time += `${second} seconds `
        }
        const message = this.getResponseMessage('START_PLAYING_RESUME_MSG', {description:description, time:time})
        const reprompt = this.getResponseMessage('START_PLAYING_RESUME_MSG_REPROMPT');
        return this.formatResponseBuilder(message,reprompt,message,reprompt,handlerInput);
    },
    removeResumeHistoryEpisode(playbackInfo, history){
        const token = playbackInfo.token;
        const episodes = Object.keys(history['episodes']);
        if(episodes.includes(token)){
            delete history['episodes'][token]
        }
    },
    getStartResumeNoResponse(handlerInput){
        const message = this.getResponseMessage('START_NO_RESUME_RESPONSE_MSG');
        const reprompt = this.getResponseMessage('REPROMPT_MSG');
        return this.formatResponseBuilder(message, reprompt, message, reprompt, handlerInput);
    },
    formatResponseBuilder(cardTitle,cardSubtitle, message, reprompt, handlerInput){
        handlerInput.responseBuilder.withStandardCard(
            this.speakSafeText(cardTitle),
            cardSubtitle,
            constants.IMAGES.standardCardSmallImageUrl,
            constants.IMAGES.standardCardLargeImageUrl
        );
        return handlerInput.responseBuilder
            .speak(this.speakSafeText(message))
            .reprompt(this.speakSafeText(reprompt))
            .getResponse();
    },
    async checkUpdateLatestResources(handlerInput,isToPlayEpisode=false){
        const {attributesManager, requestEnvelope} = handlerInput;
        if(Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.')) return;
        let sessionAttributes = attributesManager.getSessionAttributes();
        if(!sessionAttributes['updatedAt'] || (sessionAttributes['updatedAt'] < ( Date.now() - 4 * 1000 * 3600) && !isToPlayEpisode)){
            try {
                await this.callDirectiveService(handlerInput, this.getResponseMessage('UPDATELATEST_RESOURCES_PROGRESSIVE_MSG'));
            } catch (error) {
              // if it fails we can continue, but the user will wait without progressive response
              console.log("Progressive response directive error : " + error);
            }
            const newSessionAttributes = await logic.fetchLastestEposides(sessionAttributes['playlist']);
            sessionAttributes = Object.assign(sessionAttributes, newSessionAttributes)
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
}
