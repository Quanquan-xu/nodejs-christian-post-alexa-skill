const axios = require('axios');

module.exports = {
    fetchLastestEposides(attributesManager){
        const endpoint = 'https://api.edifi.app/api';
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
                const source = {
                    [eposide["id"]]:
                    {
                        id: eposide["id"],
                        title:eposide["title"],
                        imageUrl:eposide["image"]["base_url"]["blob"],
                        audioUrl:eposide["medium"]["src_url"],
                        publishedAt: eposide["published_at"]
                    }
                }
                return Object.assign(accumulator, source)
            }, {});
            const recommendedChannels = results["recommended_channels"].slice(0, 10).map(channel => ({id:channel.id,title: channel.title}));
            const newSessionAttributes = {};
            newSessionAttributes['loaded'] = true;
            attributesManager.setSessionAttributes(newSessionAttributes);
            //newSessionAttributes['timeStamp'] = Date.now();
            newSessionAttributes['lastestEposides'] = lastestEposides;
            newSessionAttributes['recommendedChannels'] = recommendedChannels;
            newSessionAttributes['playlist'] = {
                type: "episodes",
                name: "lastest episodes",
                episodes:lastestEposides
            }
            const playlistTokens = Object.keys(lastestEposides);
            newSessionAttributes['playlistTokens'] = playlistTokens
            newSessionAttributes['playlistLength'] = playlistTokens.length
            attributesManager.setSessionAttributes(newSessionAttributes);
            return lastestEposides;
        }).catch((error) => {
            //const newSessionAttributes = {};
            //newSessionAttributes['loaded'] = true;
            //attributesManager.setSessionAttributes(newSessionAttributes);
            return {};
        });
    },
    fetchChannelEposides(channelID,attributesManager){
        const endpoint = 'https://api.edifi.app/api';
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
            const lastestEposides = result["episodes"].slice(0, 10).reduce((accumulator, eposide) => {
                const source = {
                    [eposide["id"]]:
                    {
                        id: eposide["id"],
                        title:eposide["title"],
                        imageUrl:eposide["image"]["base_url"]["blob"],
                        audioUrl:eposide["medium"]["src_url"],
                        publishedAt: eposide["published_at"]
                    }
                }
                return Object.assign(accumulator, source)
            }, {});
            const newSessionAttributes = {};
            newSessionAttributes['playlist'] = {
                type: "channel",
                name: channelName,
                episodes:lastestEposides
            }
            const playlistTokens = Object.keys(lastestEposides);
            newSessionAttributes['playlistTokens'] = playlistTokens
            newSessionAttributes['playlistLength'] = playlistTokens.length
            attributesManager.setSessionAttributes(newSessionAttributes);
            return playlistTokens;
        }).catch((error) => {
            //const newSessionAttributes = {};
            //newSessionAttributes['loaded'] = true;
            //attributesManager.setSessionAttributes(newSessionAttributes);
            return [];
        });
    },
    fetchChannelNameByEpisodeID(eposideID){
        return "Hello World"
    },
    fetchPastorEposides(hostID) {
    },
    keywordSearchResults(keyword){
    }
}
