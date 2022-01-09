const User = require('./models/user');
const express = require('express');
const { createServer } = require('http');
const cryptoExtra = require('crypto-extra');
const { simpleflake } = require('simpleflakes');
const { verify: verifyCaptcha } = require('hcaptcha');

const app = express();
const server = createServer(app);

require('./database');

app.set('json spaces', 0);
app.use(express.json());
app.use(require('cors')());

const snowflake = () => simpleflake(Date.now(), null, 1581983347347).toString();

app.get('/', (req: any, res: any): void => {
	res.send('200: OK');
});

app.post('/register', async (req: any, res: any): Promise<void> => {
	if (!req.body)
		return res.status(400).json({
			status: 'error',
			messages: ['Malformed Request.']
		});

	if (!req.body.credentials)
		return res.status(400).json({
			status: 'error',
			messages: ['Malformed Request.']
		});

	const { username, email, password, captchaToken } = req.body.credentials;

	if (!username || typeof username !== 'string' || !username.trim())
		return res.status(400).json({
			status: 'error',
			messages: ['Username is a required field.']
		});

	if (username.trim().length < 3)
		return res.status(400).json({
			status: 'error',
			messages: ['Username must have at least 3 characters.']
		});

	if (username.trim().length > 20)
		return res.status(400).json({
			status: 'error',
			messages: ['Username can\'t have more than 20 characters.']
		});

	if (!email || typeof email !== 'string' || !email.trim())
		return res.status(400).json({
			status: 'error',
			messages: ['Email is a required field.']
		});

	if (!password || typeof password !== 'string' || !password.trim())
		return res.status(400).json({
			status: 'error',
			messages: ['Password is a required field.']
		});

	if (password.trim().length < 8)
		return res.status(400).json({
			status: 'error',
			messages: ['Password should have at least 8 characters.']
		});

	if (!captchaToken)
		return res.status(400).json({
			status: 'error',
			messages: ['Please complete the captcha.']
		});

	const captchaData = await verifyCaptcha(
		process.env.captchaSecret,
		captchaToken
	).catch(() => false);

	if (!captchaData)
		return res.status(500).json({
			status: 'error',
			messages: ['Internal server error on captcha verification.']
		});

	if (!captchaData.success)
		return res.status(400).json({
			status: 'error',
			messages: ['Captcha token in invalid or is expired.']
		});

	const checkUser = await User.findOne({ email: email.trim() });

	if (checkUser)
		return res.status(400).json({
			status: 'error',
			messages: ['The user already exists.']
		});

	const userID = snowflake();

	const token = `${userID}.${cryptoExtra.randomKey(
		10
	)}.${cryptoExtra.randomKey(32)}`;

	const user = new User({
		id: userID,
		username: username,
		email: email,
        password: password,
		token: token
	});

	const saved = await user.save().catch((e: Error) => ({ error: e }));
 
	if (saved && saved.error)
		return res.status(500).json({
			status: 'error',
			messages: ['Internal database error:', saved.error.toString()]
		});

	return res.status(200).json({
		status: 'success',
		token: token,
		redirect: '/interchat/es'
	});
});

app.post('/login', async (req: any, res: any): Promise<void> => {
	if (!req.body)
		return res.status(400).json({
			status: 'error',
			messages: ['Malformed Request.']
		});

	if (!req.body.credentials)
		return res.status(400).json({
			status: 'error',
			messages: ['Malformed Request.']
		});

	const { login: email, password, captchaToken } = req.body.credentials;

	if (!email || typeof email !== 'string' || !email.trim())
		return res.status(400).json({
			status: 'error',
			messages: ['Email is a required field.']
		});

	if (!password || typeof password !== 'string' || !password.trim())
		return res.status(400).json({
			status: 'error',
			messages: ['Password is a required field.']
		});

	if (!captchaToken)
		return res.status(400).json({
			status: 'error',
			messages: ['Please complete the captcha.']
		});

	const captchaData = await verifyCaptcha(
		process.env.captchaSecret,
		captchaToken
	).catch(() => false);

	if (!captchaData)
		return res.status(500).json({
			status: 'error',
			messages: ['Internal server error on captcha verification.']
		});

	if (!captchaData.success)
		return res.status(400).json({
			status: 'error',
			messages: ['Captcha token in invalid or is expired.']
		});

	const checkUser = await User.findOne({ email: email.trim() });

	if (!checkUser)
		return res.status(400).json({
			status: 'error',
			messages: ['The email or password are incorrect.']
		});

    const isMatch = await checkUser.comparePassword(password.trim());

    if (!isMatch)
        return res.status(400).json({
			status: 'error',
			messages: ['The email or password are incorrect.']
		});

    return res.status(200).json({
        status: 'success',
        token: checkUser.token,
        redirect: '/interchat/es'
    });
});

app.post('/authorize/user/:id', async (req: any, res: any): Promise<void> => {
	const user = await User.findOne({ id: req.params.id });

	if (!user)
		return res.status(404).json({
			status: 'error',
			messages: ['User not found.']
		});

	if (req.headers.authorization !== user.token)
		return res.status(401).json({
			status: 'error',
			messages: ['Invalid token provided.']
		});

    let finalUser = user.toJSON();

    finalUser._id = undefined;

    finalUser.password = undefined;

    finalUser.__v = undefined;

    finalUser = JSON.parse(JSON.stringify(finalUser));


	res.status(200).json(finalUser);
});

server.listen(3000, (): void => {
	console.log('Listening on *:3000');
});
