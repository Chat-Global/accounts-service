const express = require('express');
const admin = require('firebase-admin');
const { createServer } = require('http');
const cryptoExtra = require('crypto-extra');
const firebaseAuth = require('firebase/auth');
const { initializeApp } = require('firebase/app');
const { verify: verifyCaptcha } = require('hcaptcha');

const app = express();
const server = createServer(app);

const firebaseConfig = process.env.firebaseConfig as string;

initializeApp(JSON.parse(firebaseConfig));

const cert = process.env.cert as string;

const db = new Map();

admin.initializeApp({
	credential: admin.credential.cert(JSON.parse(cert))
});

app.set('json spaces', 0);
app.use(express.json());
app.use(require('cors')());

app.get('/', (req: any, res: any): void => {
	res.send('200: OK');
});

app.post('/register', async (req: any, res: any): Promise<void> => {
	const auth = firebaseAuth.getAuth();

	firebaseAuth.setPersistence(auth, null);

    if (!req.body) return res.status(400).json(
        {
            status: 'error',
            messages: ['Malformed Request.']
        }
    );
    
	if (!req.body.credentials) return res.status(400).json(
        {
            status: 'error',
            messages: ['Malformed Request.']
        }
    );

	const email = req.body.credentials.login;

	const password = req.body.credentials.password;

    const captchaToken = req.body.credentials.captchaToken;

	if (!email) return res.status(400).json(
        {
            status: 'error',
            messages: ['Email is a required field.']
        }
    );

	if (!password) return res.status(400).json(
        {
            status: 'error',
            messages: ['Password is a required field.']
        }
    );

	if (!captchaToken) return res.status(400).json(
        {
            status: 'error',
            messages: ['Please complete the captcha.']
        }
    );
    
    const captchaData = await verifyCaptcha(process.env.captchaSecret, captchaToken).catch(() => false);

    if (!captchaData) return res.status(500).json(
        {
            status: 'error',
            messages: ['Internal server error on captcha verification.']
        }
    );
    
    if (!captchaData.data.success) return res.status(400).json(
        {
            status: 'error',
            messages: ['Captcha token in invalid or is expired.']
        }
    );
    
	const expiresIn = 60 * 60 * 24 * 5 * 1000;

	const { user } = await firebaseAuth
		.createUserWithEmailAndPassword(auth, email, password)
		.catch((e: Error) => ({ user: { error: e } }));

	if (user.error) return res.status(401).json(
        {
            status: 'error',
            messages: [user.error.toString()]
        }
    );

	const idToken = await user.getIdToken().catch(() => false);

	const sessionCookie = await admin
		.auth()
		.createSessionCookie(idToken, { expiresIn })
		.catch(() => false);

	if (sessionCookie) {
		const token = `${user.uid}.${cryptoExtra.randomKey(
			10
		)}.${cryptoExtra.randomKey(32)}`;

		db.set(user.uid, token);

		return res.status(200).json(
            {
				status: 'success',
				token: token,
                sessionCookie: {
                    name: 'session',
                    value: sessionCookie,
                    maxAge: expiresIn
                },
                redirect: '/interchat/es'
			}
		);
	} else {
		return res.status(401).json(
            {
                status: 'error',
                messages: ['A Session Cookie could not be created.']
            }
        );
	}
});

app.post('/login', async (req: any, res: any): Promise<void> => {
	const auth = firebaseAuth.getAuth();

	firebaseAuth.setPersistence(auth, null);

    if (!req.body) return res.status(400).json(
        {
            status: 'error',
            messages: ['Malformed Request.']
        }
    );
    
	if (!req.body.credentials) return res.status(400).json(
        {
            status: 'error',
            messages: ['Malformed Request.']
        }
    );

	const email = req.body.credentials.login;

	const password = req.body.credentials.password;

    const captchaToken = req.body.credentials.captchaToken;

	if (!email) return res.status(400).json(
        {
            status: 'error',
            messages: ['Email is a required field.']
        }
    );

	if (!password) return res.status(400).json(
        {
            status: 'error',
            messages: ['Password is a required field.']
        }
    );

	if (!captchaToken) return res.status(400).json(
        {
            status: 'error',
            messages: ['Please complete the captcha.']
        }
    );
    
    const captchaData = await verifyCaptcha(process.env.captchaSecret, captchaToken).catch(() => false);

    if (!captchaData) return res.status(500).json(
        {
            status: 'error',
            messages: ['Internal server error on captcha verification.']
        }
    );
    
    if (!captchaData.data.success) return res.status(400).json(
        {
            status: 'error',
            messages: ['Captcha token in invalid or is expired.']
        }
    );

	const expiresIn = 60 * 60 * 24 * 5 * 1000;

	const { user } = await firebaseAuth
		.signInWithEmailAndPassword(auth, email, password)
		.catch((e: Error) => ({ user: { error: e } }));

	if (user.error) return res.status(401).json(
        {
            status: 'error',
            messages: ['Firebase Error', user.error.toString()]
        }
    );

	const idToken = await user.getIdToken().catch(() => false);

	const sessionCookie = await admin
		.auth()
		.createSessionCookie(idToken, { expiresIn })
		.catch(() => false);

	if (sessionCookie) {
		const token = db.get(user.uid);

		if (!token) return res.status(401).json(
            {
                status: 'error',
                messages: ['Database error.']
            }
        );

		return res.status(200).json(
            {
				status: 'success',
				token: token,
                sessionCookie: {
                    name: 'session',
                    value: sessionCookie,
                    maxAge: expiresIn
                },
                redirect: '/interchat/es'
			}
		);
	} else {
		return res.status(401).json(
            {
                status: 'error',
                messages: ['A Session Cookie could not be created.']
            }
        );
	}
});

app.post('/authorize/user/:id', async (req: any, res: any): Promise<void> => {
    res.status(200).json(db.get(req.params.id));
});

server.listen(3000, (): void => {
	console.log('Listening on *:3000');
});