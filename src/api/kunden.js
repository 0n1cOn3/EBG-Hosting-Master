require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const useragent = require('express-useragent');
const Joi = require('joi');
const DB = require('../lib/postgres');
const TV = require('../lib/TokenVerification');

const PluginConfig = {
};


/* Plugin info */
const PluginName = 'EBG-Hosting-Kunden';
const PluginRequirements = [];
const PluginVersion = '0.0.1';
const PluginAuthor = 'BolverBlitz';
const PluginDocs = '';

const limiter = rateLimit({
    windowMs: 60 * 1000 * 15,
    max: 50
});

const TokenVerify = Joi.object({
    Token: Joi.string().required()
});

const SetLang = Joi.object({
    Token: Joi.string().required(),
    Lang: Joi.string().required()
});

const router = express.Router();

router.get("/all", limiter, async (reg, res, next) => {
    try {
        const value = await TokenVerify.validateAsync(reg.query);
        let source = reg.headers['user-agent']
        let para = {
            Browser: useragent.parse(source),
            IP: reg.headers['x-forwarded-for'] || reg.socket.remoteAddress
        }
        TV.check(value.Token, para, true).then(function(Check) {
            if(Check.State){
                DB.get.user.all().then(function(result) {
                    result.map(User => {
                        User.maxcoins = Number(User.coinsperweek) * Number(process.env.MaxAllowedCoins)
                    });
                    res.status(200);
                    res.json({
                        result
                    });
                });
            }else{
                res.status(401);
                res.json({
                    Error: "No Permissions"
                });
            }
        });
    } catch (error) {
        next(error);
    }
})

router.post("/setLang", limiter, async (reg, res, next) => {
    try {
        const value = await SetLang.validateAsync(reg.body);
        let source = reg.headers['user-agent']
        let para = {
            Browser: useragent.parse(source),
            IP: reg.headers['x-forwarded-for'] || reg.socket.remoteAddress
        }
        TV.check(value.Token, para, false).then(function(Check) {  //API Token
            if(Check.State){
                Promise.all([DB.write.user.UpdateLang(value.Lang, Check.Data.email), DB.write.webtoken.UpdateLang(value.Lang, Check.Data.email)])
                .then(function(Check) {
                    res.status(200);
                    res.json({
                        Message: `Language chanced to ${value.Lang}`
                    });
                }).catch(function(error){
                    res.status(500);
                    res.json({
                        Message: "Database Error"
                    });
                });
            }else{
                DB.del.webtoken.delete(value.Token).then(function(Check) {
                    res.status(401);
                    res.json({
                        Message: "Token invalid"
                    });
                })
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = {
	router: router,
	PluginName: PluginName,
	PluginRequirements: PluginRequirements,
	PluginVersion: PluginVersion,
	PluginAuthor: PluginAuthor,
	PluginDocs: PluginDocs
};