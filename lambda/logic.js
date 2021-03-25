const axios = require('axios');
const endpoint = 'https://api.edifi.app/api';
const util = require('./util'); // utility functions

module.exports = {
    fetchLastestEposides(playlist){
        const url = endpoint + '/home?api_version=1';

        var config = {
            timeout: 6500, // timeout api call before we reach Alexa's 8 sec timeout, or set globally via axios.defaults.timeout
            headers: {'Accept': 'application/json;charset=UTF-8'}
        };

        async function getJsonResponse(url, config){
            const res = await axios.get(url, config);
            return res.data;
        }
        return getJsonResponse(url, config).then((results) => {
            const lastestEposides = results["promotions"].filter(eposide => eposide["type"]==="episode").slice(0, 10).reduce((accumulator, currentValue) => {
                const eposide = currentValue["episode"];
                const image = currentValue["image"];
                const source = util.getFormatedEpisode(eposide, image)
                return Object.assign(accumulator, source)
            }, {});
            const recommendedChannels = results["recommended_channels"].slice(0, 10).map(channel => ({id:channel.id,title: channel.title}));
            const newSessionAttributes = {};
            newSessionAttributes['updatedAt'] = Date.now();
            newSessionAttributes['lastestEposides'] = lastestEposides;
            newSessionAttributes['recommendedChannels'] = recommendedChannels;
            if(!playlist || (playlist["type"] ==="episode" && playlist['name'] === "promotion episodes")){
                newSessionAttributes['playlist'] = {
                    type: "episode",
                    name: "promotion episodes",
                    episodes:lastestEposides
                }
                const playlistTokens = Object.keys(lastestEposides);
                newSessionAttributes['playlistTokens'] = playlistTokens
                newSessionAttributes['playlistLength'] = playlistTokens.length
            }
            return newSessionAttributes;
        }).catch((error) => {
            return {error:error.toString()};
        });
    },
    fetchChannelEposides(channelID,sessionAttributes){
        const url = endpoint + `/channels/${channelID}?api_version=1`;

        var config = {
            timeout: 6500, // timeout api call before we reach Alexa's 8 sec timeout, or set globally via axios.defaults.timeout
            headers: {'Accept': 'application/json;charset=UTF-8'}
        };

        async function getJsonResponse(url, config){
            const res = await axios.get(url, config);
            return res.data;
        }
        return getJsonResponse(url, config).then((result) => {
            const channelName = result["title"]
            const image = result["image"]
            const lastestEposides = result["episodes"].slice(0, 10).reduce((accumulator, eposide) => {
                const source = util.getFormatedEpisode(eposide, image)
                return Object.assign(accumulator, source)
            }, {});
            const {playlistTokens} = util.setPlaylist("channel", channelName, lastestEposides, sessionAttributes)
            return playlistTokens;
        }).catch((error) => {
            return [];
        });
    },
    fetchChannelNameByEpisodeID(eposideID){
        return "Hello World"
    },
    fetchSearchResults(keywords,scope,handlerInput){
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const url = endpoint + `/search?api_version=1&k=${keywords}&order_by=relevancy`;
        
        var config = {
            timeout: 6500, // timeout api call before we reach Alexa's 8 sec timeout, or set globally via axios.defaults.timeout
            headers: {'Accept': 'application/json;charset=UTF-8'}
        };

        async function getJsonResponse(url, config){
            const res = await axios.get(url, config);
            return res.data;
        }
        return getJsonResponse(url, config).then((result) => {
            if(scope.toLowerCase().includes("channel")){
                const searchedChannels = result["channels"].slice(0, 10).map(channel => ({
                    id:channel['id'],
                    title: channel['title'],
                    imageUrl:channel['image']['base_url']['blob'],
                    last_published_at:channel['last_published_at'],
                    description:channel['short_description']
                }));
                
                sessionAttributes['searchedChannels'] = searchedChannels;
                sessionAttributes['isSearchedChannels'] = true;
                return util.getSayChannelsMessages(searchedChannels,handlerInput,true,false);
            }else{
                const searchedEposides = result["episodes"].slice(0, 10).reduce((accumulator, eposide) => {
                    const channelName = eposide["channel"]['title']
                    const image = eposide["channel"]["image"]
                    const source = util.getFormatedEpisode(eposide, image, channelName)
                    return Object.assign(accumulator, source)
                }, {});
                const {playlist} = util.setPlaylist("episode", "search episodes", searchedEposides, sessionAttributes)
                return util.getSayPlaylistMessages(playlist,handlerInput);
            }
        }).catch((error) => {
            return {message:error.toString()};
        });
    }
}
