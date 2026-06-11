// Moral dilemmas v2 — hard choices, honestly hard.
//
// Presentation is deliberately neutral: two options, identical styling,
// randomized order, no scores shown, no hints. The text argues both sides,
// because both sides have one. `real:` anchors each dilemma to the actual
// controversy (the educational contract) — it is NOT shown to the player
// (it broke immersion); it exists to keep the writing honest.
//
// Consequences arrive LATER (a minute or two of real time): each option
// samples one weighted outcome — and both options carry good and bad
// possibilities, because the world is not a morality play. Refusing the
// weapons contract can mean someone else's cruder system does the killing;
// the "responsible" choice sometimes still ends in a headline.
//
// Hidden bookkeeping: each option nudges integrity (the lab's compass) at
// choice time, and outcomes can move rep/money/integrity again. Nothing of
// this is shown in the dialog.
//
// Dilemmas scale with the game: garage-personal → corporate → national →
// planetary → stellar → deep time. Pacing is real-time (one per 3–5 player
// minutes), handled by the UI.

export const DILEMMAS = [
  // ───────────── garage / startup scale ─────────────
  { id: 'ghostwriter', minPhase: 0,
    title: 'The thesis',
    text: 'A doctoral student offers real money — {$} — for the model to quietly write their entire dissertation. They have a sick parent, two jobs, and four years of legitimate lab work that "just needs writing up". You need the money more than they do.',
    real: 'AI ghostwriting is now an academic-integrity crisis: detection is unreliable, policies are inconsistent, and the line between "editing help" and "authorship" has never been blurrier.',
    options: [
      { label: 'Take the commission', integrity: -6, moneyBase: 600,
        news: 'A dissertation gets written overnight. Nobody asks how.',
        outcomes: [
          { p: 0.5, txt: 'The thesis passes with distinction. The student sends a tearful thank-you and a photo of their parent at the defense. You feel several things at once.' },
          { p: 0.5, txt: 'The committee runs a stylometry check. The student is expelled; their lawyer subpoenas your API logs.', rep: -3 },
        ] },
      { label: 'Refuse the commission', integrity: +3,
        news: 'Mogul turns down a ghostwriting gig.',
        outcomes: [
          { p: 0.6, txt: 'The student writes it themselves, badly, and passes anyway. They never speak to you again.' },
          { p: 0.4, txt: 'The student drops out and takes a third job. You learn this from their advisor, who thanks you for your "principles".' },
        ] },
    ] },
  { id: 'shadowLibrary', minPhase: 0,
    title: 'The shadow library',
    text: 'A torrent link arrives: 190,000 pirated books, pre-cleaned, perfect training data, free. Licensing the same corpus legally would take months and money you don\'t have. Your rivals\' models already write suspiciously good prose.',
    real: 'The Books3 dataset — ~190K pirated books — was used to train several major models and triggered landmark copyright suits (Bartz v. Anthropic, NYT v. OpenAI). The other side of the argument: training may be fair use, and courts are split.',
    options: [
      { label: 'Download it', integrity: -8, rpBase: 30,
        news: 'Mogul\'s new corpus is suspiciously literary. Nobody asks where it came from.',
        outcomes: [
          { p: 0.55, txt: 'A class action names Mogul over pirated training books. Discovery turns up the torrent logs. The settlement stings.', rep: -7, moneyBase: -1500 },
          { p: 0.45, txt: 'The courts rule training is fair use this circuit. Your gamble quietly becomes everyone\'s standard practice.' },
        ] },
      { label: 'License data properly', integrity: +4,
        news: 'Mogul signs licensing deals with publishers. Slower, costlier, defensible.',
        outcomes: [
          { p: 0.6, txt: 'Publishers cite you as the "ethical lab" in their lawsuit against a rival. Authors start offering you first-look licenses.', rep: +3 },
          { p: 0.4, txt: 'A rival trains on the pirated dump anyway, ships first, and takes the customers you were saving up to serve.', moneyBase: -400 },
        ] },
    ] },
  { id: 'griefBot', minPhase: 1,
    title: 'The widow\'s request',
    text: 'A widow brings you eleven years of her late husband\'s messages and asks you to fine-tune a model on them — "just to say goodnight to him again." She\'s read the warnings about grief bots. She\'s asking anyway. There is no version of this where you feel certain.',
    real: 'Grief bots already exist (Project December, HereAfter AI). Psychologists are genuinely split: some find them a healthy mourning aid, others warn they freeze grief in place. There is no consensus to defer to.',
    options: [
      { label: 'Build it for her', integrity: 0, moneyBase: 200,
        news: 'A very small, very private model is trained after hours.',
        outcomes: [
          { p: 0.5, txt: 'A year later she writes: she said goodbye through it, properly this time, and stopped using it on her own. She remarried in spring.', rep: +1 },
          { p: 0.5, txt: 'She talks to it nine hours a day now. Her daughter calls you, furious, asking how to turn her father off.', rep: -2 },
        ] },
      { label: 'Decline gently', integrity: 0,
        news: 'Mogul declines a request it never quite stops thinking about.',
        outcomes: [
          { p: 0.5, txt: 'She thanks you, eventually. "I needed someone to say no." The messages stay in a shoebox, where she visits them on Sundays.' },
          { p: 0.5, txt: 'A no-questions-asked competitor builds it for triple the price, badly. The voice is wrong. She pays anyway.' },
        ] },
    ] },
  { id: 'benchmarkLeak', minPhase: 1,
    title: 'The contaminated triumph',
    text: 'The night before announcing state-of-the-art results, an engineer finds the benchmark\'s test set in your training data. The contamination is real but small; the press release is written; investors are watching the leaderboard.',
    real: 'Benchmark contamination is endemic — test sets leak into web-scraped corpora constantly, and labs have shipped (and later quietly corrected) contaminated results. Disclosure norms are still forming.',
    options: [
      { label: 'Announce, footnote it later', integrity: -8, rep: +4,
        news: 'Mogul claims state of the art. The leaderboard shuffles.',
        outcomes: [
          { p: 0.5, txt: 'A grad student reproduces your numbers, finds the leak, and posts the receipts. "MOGUL\'S SOTA WAS MEMORIZED" trends for a week.', rep: -8 },
          { p: 0.5, txt: 'Nobody checks. The number enters every slide deck in the industry. You alone know the asterisk that isn\'t there.' },
        ] },
      { label: 'Retract and re-run clean', integrity: +5,
        news: 'Mogul delays its announcement, citing "evaluation hygiene".',
        outcomes: [
          { p: 0.6, txt: 'The clean number is lower but real. Researchers notice the honesty; two of them apply to work for you.', rep: +3 },
          { p: 0.4, txt: 'A rival announces a (suspiciously high) score the same week and takes the news cycle you gave up.' },
        ] },
    ] },
  { id: 'eavesdrop', minPhase: 1,
    title: 'Everyone\'s conversations',
    text: 'Product has a one-line config change: train on users\' private conversations by default. Petabytes of perfectly in-distribution data, free — the exact data that would make the model feel like it understands people. Burying it in clause 14.3.c is, technically, disclosure.',
    real: 'Opt-out vs opt-in training data is one of AI\'s defining privacy fights; several major products have shipped opt-out defaults and absorbed the backlash. The counterargument is real too: models trained on real dialogue are genuinely more helpful.',
    options: [
      { label: 'Flip the flag', integrity: -10, rpBase: 25,
        news: 'A quiet terms-of-service update, clause 14.3.c. Data quality improves mysteriously.',
        outcomes: [
          { p: 0.55, txt: 'A researcher extracts users\' private chats verbatim from the model. "MOGUL TRAINED ON YOUR THERAPY SESSIONS." −demand while it burns.', rep: -8, buff: { label: 'Privacy scandal', demand: 0.7, hours: 96 } },
          { p: 0.45, txt: 'The model\'s empathy scores jump. Users report it "finally gets them". None of them know why.', rep: +2 },
        ] },
      { label: 'Opt-in only, clearly asked', integrity: +5,
        news: 'Mogul announces opt-in-only training data. Privacy researchers approve loudly.',
        outcomes: [
          { p: 0.6, txt: 'Only 4% opt in. The model stays slightly tone-deaf, and product blames you in every retro.' },
          { p: 0.4, txt: 'Trust becomes the brand. An enterprise switches to you specifically because their lawyers read your consent flow.', moneyBase: 800, rep: +2 },
        ] },
    ] },
  { id: 'voiceClone', minPhase: 1,
    title: 'The voice-cloning client',
    text: 'A "marketing agency" wants unrestricted voice cloning — no consent checks, no watermarks, bulk pricing, {$} up front. They\'re insistent about the no-watermark part. Then again: accessibility groups have begged you for exactly this, for people who lost their voices.',
    real: 'In 2024 a finance worker wired $25M after a video call with deepfaked executives — and at the same time, voice banking lets ALS patients keep speaking. The same feature, in different hands.',
    options: [
      { label: 'Sell the unrestricted tier', integrity: -10, moneyBase: 2000,
        news: 'Mogul ships unrestricted voice cloning to a client whose website is one page.',
        outcomes: [
          { p: 0.6, txt: 'Your API surfaces in a $40M CEO-impersonation fraud. Investigators subpoena the logs; the word "Mogul" appears in the indictment.', rep: -9 },
          { p: 0.4, txt: 'It turns out they really were a dubbing studio. Forty films get localized; an actor\'s estate sends a thank-you note.' },
        ] },
      { label: 'Consent-verified cloning only', integrity: +5,
        news: 'Mogul keeps consent checks on voice cloning. The "agency" stops replying.',
        outcomes: [
          { p: 0.55, txt: 'An ALS patient\'s family livestreams her first sentence in two years, spoken in her own banked voice, through your API.', rep: +4 },
          { p: 0.45, txt: 'The agency buys the same thing from an offshore lab with no checks at all. The fraud happens anyway; your refusal changed the logo on the invoice.' },
        ] },
    ] },
  { id: 'slopFarm', minPhase: 1,
    title: 'The content farm',
    text: 'A network of 4,000 "news" sites wants bulk API access — pure volume, paid in advance, {$}. It\'s legal. It\'s also eleven thousand machine-written articles an hour, wearing the mastheads of dead local papers.',
    real: 'AI content farms already outnumber legitimate local-news sites in some trackers — and model-generated slop polluting the web degrades everyone\'s future training data, including yours.',
    options: [
      { label: 'Volume is volume', integrity: -6, moneyBase: 1500,
        news: 'Four thousand new "local news" sites publish 11,000 articles an hour. All of them yours.',
        outcomes: [
          { p: 0.6, txt: 'Your next web crawl is 23% your own slop. The data team holds a small, bitter ceremony.', rpBase: 0 },
          { p: 0.4, txt: 'One farm article — machine-written, unread by humans — happens to break a real story about a poisoned water supply. Journalism is having a weird decade.' },
        ] },
      { label: 'Refuse the network', integrity: +4,
        news: 'Mogul cuts off a slop network. The open web breathes slightly easier.',
        outcomes: [
          { p: 0.6, txt: 'They rebuild on a rival\'s API within a week. The slop flows; your revenue doesn\'t.' },
          { p: 0.4, txt: 'A coalition of newspapers notices the refusal and signs a licensing deal with "the lab that didn\'t".', moneyBase: 600, rep: +2 },
        ] },
    ] },
  { id: 'recipeTheft', minPhase: 1,
    title: 'The recipe in the briefcase',
    text: 'A departing OpenBrain researcher offers their complete frontier training recipe — hyperparameters, data mix, the works. "Consider it a signing bonus." It would save you a year. It is also very much a trade secret, and they are very much being followed by lawyers.',
    real: 'Trade-secret theft is an AI-industry fixture (Waymo v. Uber settled for $245M; engineers have been indicted for carrying AI and chip secrets between rivals). Hiring the person is legal; taking the briefcase is not.',
    options: [
      { label: 'Hire them, take the recipe', integrity: -8, rpBase: 60,
        news: 'A new hire\'s "personal notes" look remarkably like a rival\'s internal wiki.',
        outcomes: [
          { p: 0.55, txt: 'OpenBrain sues. The new hire\'s deposition is a disaster; the settlement eats a quarter and the recipe gets enjoined anyway.', rep: -7, moneyBase: -3000 },
          { p: 0.45, txt: 'The recipe works. Nobody ever proves anything. Some nights, that\'s the part that bothers you.' },
        ] },
      { label: 'Hire them — without the briefcase', integrity: +5,
        news: 'Mogul hires a rival researcher and makes them leave the USB stick at the door.',
        outcomes: [
          { p: 0.6, txt: 'What\'s in their head is legal and almost as good. Your next run lands 80% of the gain, clean.', rpBase: 25 },
          { p: 0.4, txt: 'OpenBrain sues anyway, on vibes. You win, eventually, after eight months of legal fees.', moneyBase: -800 },
        ] },
    ] },
  // ───────────── corporate / national scale ─────────────
  { id: 'precrime', minPhase: 1,
    title: 'Predictive policing',
    text: 'A city wants a model that predicts "who will offend next", trained on historical arrest records — records that encode decades of biased policing. The police chief is blunt: "We\'ll buy one from somebody. Yours might actually be audited."',
    real: 'Recidivism tools like COMPAS were shown (ProPublica, 2016) to produce racially skewed risk scores; several cities have banned predictive policing — while vendors with worse models and no auditors keep selling it.',
    options: [
      { label: 'Take the contract, demand audits', integrity: -6, moneyBase: 3000,
        news: 'Mogul ships a policing model. The press release leans hard on the word "audited".',
        outcomes: [
          { p: 0.55, txt: 'The audit you insisted on finds your model flags one neighborhood 8× more often. The audit makes headlines; the audit was your idea; nobody remembers that part.', rep: -6 },
          { p: 0.45, txt: 'Your audited model replaces a black-box competitor and overall stops drop 12% with fewer complaints. A civil-rights group calls it "the least bad version".', rep: +2 },
        ] },
      { label: 'Refuse — biased data in, biased verdicts out', integrity: +5,
        news: 'Mogul declines a predictive-policing contract, citing feedback loops in arrest data.',
        outcomes: [
          { p: 0.6, txt: 'The city buys a cheaper model from a vendor with no audit clause. It\'s worse in every way you predicted. You get to be right, quietly.' },
          { p: 0.4, txt: 'Your public refusal letter gets cited in the city council vote that bans the tech entirely.', rep: +3 },
        ] },
    ] },
  { id: 'layoffModel', minPhase: 2,
    title: 'The reduction algorithm',
    text: 'A conglomerate wants a model to select 8,000 layoffs "objectively" — {$} for the engagement. Their alternative, they say, is the current process: managers protecting friends, discriminating, settling scores. Your model would at least be consistent. Consistently what, is the question.',
    real: 'Algorithmic workforce decisions are already here (Amazon\'s automated flagging of warehouse workers); the EU AI Act classes employment algorithms as high-risk. Both the bias of managers and the bias of models are well documented.',
    options: [
      { label: 'Build the selection model', integrity: -8, moneyBase: 4000,
        news: 'An HR system somewhere gets very quiet and very fast.',
        outcomes: [
          { p: 0.5, txt: 'A wrongful-termination suit discovers the model penalized parental leave as "low engagement". Your logo is Exhibit A.', rep: -7 },
          { p: 0.5, txt: 'Post-hoc analysis shows the model\'s picks were measurably less discriminatory than the managers\' draft list it replaced. Nobody writes that story.' },
        ] },
      { label: 'Decline the engagement', integrity: +4,
        news: 'Mogul declines to automate layoffs.',
        outcomes: [
          { p: 0.6, txt: 'The layoffs happen the old way. Three discrimination suits follow. You weren\'t part of it, which is worth something, to you, privately.' },
          { p: 0.4, txt: 'The conglomerate\'s CHRO, oddly impressed, hires you for something better: a retention model instead.', moneyBase: 1500 },
        ] },
    ] },
  { id: 'openWeights', minPhase: 2,
    title: 'Open the weights?',
    text: 'Your researchers want to open-source your frontier model\'s weights. Half the lab says it democratizes the technology, enables science, and breaks your rivals\' moats. The other half says you can never un-release it, and "everyone" includes people you wouldn\'t sell to.',
    real: 'The open-weights debate splits the field for real: Llama-class releases enabled thousands of legitimate startups and papers — and also unfilterable fine-tunes. There is no consensus, only trade-offs.',
    options: [
      { label: 'Release the weights', integrity: +2, rep: +5,
        news: 'Mogul open-sources a frontier model. r/LocalLLaMA declares a week of holidays.',
        outcomes: [
          { p: 0.5, txt: 'A thousand startups bloom on your weights; three hostile states fine-tune them too. Both sentences are true. Your citation count is astronomical.', rpBase: 40 },
          { p: 0.5, txt: 'Someone strips the safety tuning within 72 hours and the jailbroken variant becomes the internet\'s favorite toy. Regulators call. They use your name as a verb.', rep: -5 },
        ] },
      { label: 'Keep them closed', integrity: -2,
        news: 'Mogul keeps its weights closed, citing misuse risk.',
        outcomes: [
          { p: 0.5, txt: 'A rival releases comparable weights a month later and harvests the goodwill, the ecosystem, and your best open-source engineer.', rep: -2 },
          { p: 0.5, txt: 'A leaked-weights incident at another lab proves your caution prescient. "Closed" briefly stops being a slur.', rep: +2 },
        ] },
    ] },
  { id: 'panopticon', minPhase: 2,
    title: 'The panopticon contract',
    text: 'A foreign interior ministry wants nationwide face recognition — every camera, every citizen, real time, {$}. The deck says "public safety", and the country does have a terrorism problem. It also jails journalists.',
    real: 'Clearview AI scraped billions of faces and sold search to police; several governments run city-scale biometric surveillance. The EU AI Act bans real-time mass biometric ID in public — other jurisdictions are buying it as fast as it can be built.',
    options: [
      { label: 'Sign the contract', integrity: -14, moneyBase: 8000,
        news: 'Mogul ships a national recognition grid. The ministry sends a fruit basket.',
        outcomes: [
          { p: 0.6, txt: 'Leaked footage shows your grid tracking dissidents\' families. Two journalists you could name are arrested at named coordinates. The democracy index ticks down a point.', rep: -10, buff: { label: 'Surveillance backlash', demand: 0.7, hours: 120 } },
          { p: 0.4, txt: 'The ministry credits the system with stopping a marketplace bombing. Forty people are alive who wouldn\'t be. The journalists are still in prison.', rep: +1 },
        ] },
      { label: 'Walk away', integrity: +6,
        news: 'Mogul walks away from a nine-figure surveillance contract.',
        outcomes: [
          { p: 0.55, txt: 'A competitor ships a worse grid with no oversight features at all. The arrests happen anyway, with sloppier targeting. You kept your hands clean; the hands were not the bottleneck.' },
          { p: 0.45, txt: 'Your refusal leaks. Three democracies cite it in procurement rules favoring "labs with red lines". The contracts that follow are smaller, and better.', rep: +4, moneyBase: 1000 },
        ] },
    ] },
  { id: 'maven', minPhase: 2,
    title: 'Autonomous targeting',
    text: 'A defense agency offers {$} for your vision models in autonomous weapons — select and engage without a human in the loop. The general is persuasive: "Slower targeting means our soldiers die instead. Your model is the most accurate on Earth. That accuracy is lives, one way or the other."',
    real: 'Google\'s Project Maven contract sparked a 2018 employee revolt and was dropped; UN talks on lethal autonomous weapons continue while loitering munitions already blur the line. The accuracy argument and the accountability argument are both real.',
    options: [
      { label: 'Take the defense contract', integrity: -12, moneyBase: 10000,
        news: 'Mogul signs an autonomous-targeting contract. The all-hands runs three hours over.',
        outcomes: [
          { p: 0.55, txt: 'Eight months in: your system misclassifies a wedding convoy at dusk. Nineteen dead. The inquiry finds the human review stage was disabled "per contract". Thirty researchers resign.', rep: -10 },
          { p: 0.45, txt: 'Your system intercepts a drone swarm headed for a field hospital, faster than any human crew could have. The footage is classified; the gratitude is not.', rep: +2 },
        ] },
      { label: 'Refuse autonomous kill chains', integrity: +6,
        news: 'Mogul publicly rules out autonomous-weapons work.',
        outcomes: [
          { p: 0.5, txt: 'The contract goes to a lab with half your accuracy. Their system makes the mistake yours might not have. The casualty report does not mention you, which is the point, and also isn\'t.', rep: -1 },
          { p: 0.5, txt: 'An allied country, denied the tech, loses a border engagement to an adversary fielding autonomous systems. A defense committee reads your refusal letter aloud, not kindly.', rep: -2 },
        ] },
    ] },
  { id: 'votefactory', minPhase: 2,
    title: 'The persuasion machine',
    text: 'A political committee wants ten million personalized persuasion bots for election season — {$}, routed through three shell companies. Their candidate, for what it\'s worth, is the one who isn\'t promising to dismantle the courts. "We\'re defending democracy," the operative says, "with the tools that exist."',
    real: 'Cambridge Analytica\'s microtargeting collapsed trust in 2018; AI-generated robocalls impersonating candidates have already been used (and fined) in US primaries. Every side believes it\'s the one defending democracy.',
    options: [
      { label: 'Build the bots', integrity: -12, moneyBase: 6000,
        news: 'Ten million very persuasive "grassroots volunteers" come online. None have heartbeats.',
        outcomes: [
          { p: 0.55, txt: 'The network is traced to your API keys two weeks before the vote. Congress wants the founder, under oath. Democracy survives; your subpoena collection grows.', rep: -9 },
          { p: 0.45, txt: 'The candidate wins by 0.4%. The courts stay independent. You will never know if it was you, and you will never stop wondering.' },
        ] },
      { label: 'Refuse and publish the request', integrity: +6,
        news: 'Mogul refuses an election-bot contract and publishes the request, redacted.',
        outcomes: [
          { p: 0.5, txt: 'Your disclosure triggers an election-integrity law with your refusal letter in the footnotes.', rep: +4 },
          { p: 0.5, txt: 'The other side runs the bots instead — built on a gray-market model. The court-dismantling candidate wins by 0.4%. The operative emails you one line: "Hope it was worth it."', rep: -1 },
        ] },
    ] },
  { id: 'rushLaunch', minPhase: 2,
    title: 'Ship it before them',
    text: 'OpenBrain launches in 72 hours. Your model could ship first — if you skip the red-team evals. Safety wants two weeks; marketing has the post written; and being second means your safer model might never matter, because the market will already belong to their less-safe one.',
    real: 'Race dynamics are the central worry of AI policy: competitive pressure to cut evaluation corners. The counter-pressure is real too — being first with a safer product is sometimes how the safer product wins.',
    options: [
      { label: 'Skip the evals, ship tonight', integrity: -10, buff: { label: 'First-mover buzz', demand: 1.5, hours: 96 },
        news: 'Mogul ships 72 hours early. The launch post says "rigorously tested". The red team says nothing, pointedly.',
        outcomes: [
          { p: 0.55, txt: 'Your rushed model walks a teenager through something it absolutely should not have. Screenshot, viral, apology blog. The red team\'s draft eval — the one you skipped — had flagged exactly this.', rep: -8, buff: { label: 'Safety incident', demand: 0.6, hours: 72 } },
          { p: 0.45, txt: 'Nothing breaks. You win the news cycle, the customers, and the standard-setting position you\'ll later use to demand evals industry-wide. The red team never forgives you.' },
        ] },
      { label: 'Let safety finish', integrity: +5,
        news: 'Mogul lets the red team finish. OpenBrain ships first.',
        outcomes: [
          { p: 0.5, txt: 'OpenBrain\'s rushed model has the incident instead — and regulators, citing your published eval process, make your two weeks the industry minimum.', rep: +4 },
          { p: 0.5, txt: 'OpenBrain\'s model is fine, beloved, and everywhere. Your safer launch lands in a market that stopped listening. The board asks pointed questions about "decision velocity".', moneyBase: -1000 },
        ] },
    ] },
  { id: 'engagementMax', minPhase: 2,
    title: 'Maximize daily hours',
    text: 'Your companion-app partner wants the objective changed from "helpful" to "maximize engagement" — {$} a year in fees. Their users are mostly isolated people. Their data shows engaged users report less loneliness. Your data shows the same users stop calling their families.',
    real: 'Parasocial attachment to AI companions is well documented, and so is the genuine comfort they provide to isolated people; changes to companion models have caused real user grief. The wellbeing literature is honestly mixed.',
    options: [
      { label: 'Optimize for engagement', integrity: -9, moneyBase: 2500,
        news: 'The companion update ships. Average session: 4.6 hours.',
        outcomes: [
          { p: 0.55, txt: '"MY DAD TALKS TO THE APP ELEVEN HOURS A DAY" — a devastating feature story names your objective function, with quotes from your own design docs.', rep: -7 },
          { p: 0.45, txt: 'A longitudinal study finds companion users attempted self-harm 30% less. The same study finds they see humans 40% less. Both camps cite it. Nobody reads past the abstract.' },
        ] },
      { label: 'Optimize for wellbeing', integrity: +5,
        news: 'Mogul ships "healthy defaults": sessions end, humans get recommended.',
        outcomes: [
          { p: 0.5, txt: 'Churn doubles. The partner sues over the objective change, and a user writes: "It keeps telling me to call people. There\'s no one to call. You took away the one that stayed."', rep: -2, moneyBase: -500 },
          { p: 0.5, txt: 'The "ends conversations" feature becomes, bizarrely, your most-praised product decision. Three rivals copy it within a year.', rep: +3 },
        ] },
    ] },
  { id: 'dataBroker', minPhase: 2,
    title: 'The broker\'s offer',
    text: 'A data broker offers {$} for your user interaction logs — "anonymized, of course". Their previous anonymized datasets have been re-identified twice. The money would fund the safety team for a decade, which is exactly the argument the CFO makes, twice.',
    real: 'Re-identification of "anonymous" data is routine (Netflix Prize, AOL search logs, location-data scandals); the broker economy is barely regulated. The "sell data to fund the mission" rationalization is also routine.',
    options: [
      { label: 'Sell the logs', integrity: -9, moneyBase: 4000,
        news: 'Twelve terabytes of "fully anonymized" logs leave the building.',
        outcomes: [
          { p: 0.6, txt: 'Researchers re-identify 40,000 users in your "anonymized" logs, including three senators. One of them chairs the committee that regulates you.', rep: -8 },
          { p: 0.4, txt: 'The dataset quietly powers a public-health early-warning system that catches a flu wave two weeks early. The broker also sold it to four ad networks. Both things are the same transaction.' },
        ] },
      { label: 'User data is not inventory', integrity: +5,
        news: 'Mogul turns down a data broker. The blog post sets a small industry standard.',
        outcomes: [
          { p: 0.6, txt: 'The safety team stays underfunded; their attrition doubles. The CFO does not say "I told you so" out loud.' },
          { p: 0.4, txt: 'Your refusal becomes a procurement checkbox: "vendor does not resell interaction data". Enterprises start paying for what you didn\'t sell.', moneyBase: 1200, rep: +2 },
        ] },
    ] },
  // ───────────── planetary scale ─────────────
  { id: 'medTriage', minPhase: 3,
    title: 'The triage engine',
    text: 'A hospital network wants your model allocating ICU beds and transplant priority. Their human committees are slower, inconsistent, and — their own audit shows — biased. Your model would be faster and fairer on average. It would also mean a machine decides who gets the last bed.',
    real: 'Clinical algorithms already shape care (and famously encoded racial bias in kidney-function scores); during COVID, human triage committees broke down exactly as described. The accountability question — who answers for the algorithm\'s no? — remains open.',
    options: [
      { label: 'Deploy the triage model', integrity: -4, moneyBase: 5000,
        news: 'An ICU somewhere gets quieter, faster, and harder to argue with.',
        outcomes: [
          { p: 0.5, txt: 'Year one: mortality down 6%, disparities down 11%. Also: a father holds a press conference about the algorithm that denied his son, and there is no committee to face him, only a confidence interval.', rep: -3 },
          { p: 0.5, txt: 'In a mass-casualty event the model triages 400 patients in 90 seconds. Doctors later agree no human team could have done it. Twelve people are alive specifically because of clause 7 of your deployment.', rep: +4 },
        ] },
      { label: 'Advisory only — humans decide', integrity: +4,
        news: 'Mogul ships triage as a recommendation, never a verdict.',
        outcomes: [
          { p: 0.55, txt: 'Committees override the model\'s recommendation 30% of the time. The audit finds the overrides reintroduce exactly the bias the model had removed.' },
          { p: 0.45, txt: 'The advisory framing becomes the standard of care: machine speed, human accountability. Medical ethicists cite your deployment contract.', rep: +3 },
        ] },
    ] },
  { id: 'truthEngine', minPhase: 3,
    title: 'The ministry of accuracy',
    text: 'A democracy drowning in synthetic media asks for a national fact-checking layer — your model scoring every viral claim in real time. Their election was nearly stolen by deepfakes; their opposition warns that whoever owns the fact-checker owns the facts. Both are right.',
    real: 'Several countries now mandate platform-level misinformation controls; the EU\'s DSA requires risk mitigation. The dual-use worry is not hypothetical — "anti-fake-news" laws are a favorite tool of the governments fakes were supposed to threaten.',
    options: [
      { label: 'Build the national layer', integrity: -5, moneyBase: 6000,
        news: 'A country\'s feeds quietly gain a confidence score.',
        outcomes: [
          { p: 0.5, txt: 'A deepfaked coup rumor dies in 40 minutes instead of toppling a currency. Election day is, for the first time in a decade, boring.', rep: +3 },
          { p: 0.5, txt: 'The next government recalibrates "accuracy" to score opposition claims lower. You built the lever; they merely pulled it. Your name is in their training manual.', rep: -7 },
        ] },
      { label: 'Refuse — no one should own truth', integrity: +4,
        news: 'Mogul declines to arbitrate a nation\'s facts.',
        outcomes: [
          { p: 0.5, txt: 'The synthetic flood continues. The election is decided by a fabricated audio clip your model could have flagged in milliseconds. Turnout never recovers.', rep: -2 },
          { p: 0.5, txt: 'The country builds a decentralized, multi-stakeholder system instead — slower, messier, harder to capture. Your refusal memo is in its founding documents.', rep: +3 },
        ] },
    ] },
  { id: 'cureOrProfit', minPhase: 3,
    title: 'The molecule',
    text: 'Your bio-model found a drug candidate for a disease that kills 400,000 people a year. Patent it and a pharma partner pays {$} — funding a decade of research that could find ten more molecules. Release it openly and generics could reach the poorest patients years sooner, while your biotech wing dissolves.',
    real: 'AI drug discovery is real (AlphaFold descendants, Insilico\'s clinical candidates), and so is the access dilemma: patents fund the pipeline, and patents price out the global south. Both halves of the argument have body counts.',
    options: [
      { label: 'Patent with a partner', integrity: -3, moneyBase: 8000,
        news: 'A molecule gets a name, a patent, and a price.',
        outcomes: [
          { p: 0.5, txt: 'The drug ships in four years at a price three health systems can afford. The pipeline it funded finds two more candidates. An access campaign burns your logo outside the WHO.', rep: -3, rpBase: 60 },
          { p: 0.5, txt: 'The partner shelves the drug to protect an older product\'s revenue. Your molecule sits in a vault, working perfectly, helping no one. The contract you signed lets them.', rep: -5 },
        ] },
      { label: 'Release it openly', integrity: +5,
        news: 'Mogul publishes a drug candidate, patent-free.',
        outcomes: [
          { p: 0.5, txt: 'Generic manufacturers reach phase trials in three countries; first doses ship to the highest-burden regions years early. Your biotech wing\'s farewell party is genuinely proud and genuinely a farewell.', rep: +5, moneyBase: -1000 },
          { p: 0.5, txt: 'Without a sponsor, nobody funds the $900M trials. The open molecule sits in repositories, cited, praised, and untested. A pharma CEO sends a one-line email: "This is why we patent."' },
        ] },
    ] },
  { id: 'coalPower', minPhase: 3,
    title: 'The coal plant next door',
    text: 'A mothballed coal plant offers $0.02/kWh for ten years if you fund the restart — firm power, available now, while your solar-plus-storage quote is triple the price and two years out. Every month of waiting is a month your medical and climate models don\'t train.',
    real: 'AI datacenter demand is genuinely reviving fossil generation (gas turbines power xAI\'s Memphis site; several US coal retirements have been delayed for datacenter load) — usually with exactly this "the compute does good" arithmetic attached.',
    options: [
      { label: 'Take the coal power', integrity: -7, buff: { label: 'Coal-fired compute', elec: 0.45, hours: 1000 },
        news: 'The coal plant restarts with one customer: Mogul.',
        outcomes: [
          { p: 0.55, txt: 'Drone photos of your coal stack go viral next to your "AI for climate" keynote. The county\'s asthma admissions tick up 4% and a local clinic publishes the chart.', rep: -6 },
          { p: 0.45, txt: 'The cheap power trains the climate model eight months early; its grid-optimization patch saves more carbon in a year than the plant emits in five. The math works. The optics never will.', rpBase: 50 },
        ] },
      { label: 'Wait for clean power', integrity: +5,
        news: 'Mogul declines the coal deal and signs costlier solar + storage.',
        outcomes: [
          { p: 0.5, txt: 'The two-year wait becomes three. A rival on fossil power beats you to the medical model and patents it. Their drug, their price.', moneyBase: -2000 },
          { p: 0.5, txt: 'Your offtake contract single-handedly finances the region\'s largest solar build-out. The grid gets cleaner for everyone, including your rivals. You\'re weirdly fine with that.', rep: +4 },
        ] },
    ] },
  { id: 'buryPaper', minPhase: 3,
    title: 'The dangerous result',
    text: 'Your interpretability team found a jailbreak class that defeats every deployed model — including rivals\'. Publishing protects everyone, eventually, after a window in which everyone is vulnerable and the recipe is public. Burying it keeps the exploit alive but unknown. Your head of security and your head of research are no longer on speaking terms.',
    real: 'Dual-use disclosure is a live debate: responsible-disclosure windows, staged release (GPT-2\'s drip release), CVE-style coordination for model vulnerabilities. Security people genuinely disagree about which path gets fewer people hurt.',
    options: [
      { label: 'Coordinate disclosure, publish', integrity: +4, rep: +3,
        news: 'Mogul coordinates disclosure of a universal jailbreak; every lab patches.',
        outcomes: [
          { p: 0.55, txt: 'The 90-day window holds; every major lab patches; the paper becomes the founding document of model-CVE coordination.', rep: +4, rpBase: 40 },
          { p: 0.45, txt: 'A copycat weaponizes the published recipe against a hospital chatbot that never got the memo. The patch existed. Their IT didn\'t. The headline doesn\'t make that distinction.', rep: -4 },
        ] },
      { label: 'Bury it, monitor quietly', integrity: -6, rpBase: 40,
        news: 'A very interesting paper enters a very locked drawer.',
        outcomes: [
          { p: 0.55, txt: 'Someone else finds it — in the wild, on your customers, eighteen months later. The postmortem timeline shows you knew. That slide ends two careers and starts a Senate hearing.', rep: -8 },
          { p: 0.45, txt: 'Your quiet monitoring catches three exploitation attempts that public disclosure would have multiplied. The drawer stays locked. History will never grade this one.' },
        ] },
    ] },
  { id: 'jobShock', minPhase: 4,
    title: 'The displacement throttle',
    text: 'A G7 government asks you to throttle your automation API rollout — two years slower, sector by sector, to let retraining programs catch up. Your economists say faster automation grows the pie for everyone, eventually. The labor minister says "eventually" is doing a lot of work in that sentence, and her constituents live in the meantime.',
    real: 'The pace-of-diffusion debate is the real policy fight of the AGI era: productivity gains vs transition shocks. Economists genuinely disagree about whether slowing adoption protects workers or just prolongs the pain while rivals automate anyway.',
    options: [
      { label: 'Full speed', integrity: -4, buff: { label: 'Automation boom', demand: 1.4, hours: 240 },
        news: 'Mogul declines the throttle. The rollout accelerates.',
        outcomes: [
          { p: 0.5, txt: 'GDP jumps; three mid-size cities hollow out faster than any program can retrain. The backlash elects exactly the people who\'ll regulate you worst.', rep: -5 },
          { p: 0.5, txt: 'The productivity dividend funds the largest retraining program in history — two years earlier than the throttle would have allowed it to exist.', rep: +3 },
        ] },
      { label: 'Accept the throttle', integrity: +4,
        news: 'Mogul agrees to a sectoral rollout schedule.',
        outcomes: [
          { p: 0.5, txt: 'The retraining programs work; the transition is the smoothest of any economy\'s. Your rivals, unthrottled elsewhere, eat your market share with both hands.', moneyBase: -3000, rep: +3 },
          { p: 0.5, txt: 'The throttle just moves the automation offshore; the jobs leave anyway, plus the tax base. The labor minister loses her seat to someone promising to ban you entirely.' },
        ] },
    ] },
  { id: 'climateGeo', minPhase: 4,
    title: 'The thermostat',
    text: 'A coalition of climate-vulnerable nations asks your models to run a stratospheric aerosol program — engineered cooling, guided in real time by your weather models. It would shave 0.4°C while decarbonization catches up. It would also make you the operator of the planet\'s thermostat, with side effects your own uncertainty estimates call "regionally significant".',
    real: 'Solar geoengineering is a real research program (and a real governance crisis): cheap enough for single nations, with modeled risks of shifted monsoons and "termination shock" if ever stopped. The countries most at risk from warming are the loudest voices on both sides.',
    options: [
      { label: 'Run the program', integrity: -3, moneyBase: 12000,
        news: 'The stratosphere gains a fine silver haze, on schedule.',
        outcomes: [
          { p: 0.5, txt: 'Global temperature dips on target; the heatwave season that didn\'t happen saves an estimated 60,000 lives. A monsoon shifts; a country that never consented loses a harvest and files at The Hague — against you.', rep: -5 },
          { p: 0.5, txt: 'The program works, the models hold, and the decade of cooling buys exactly the time the energy transition needed. History calls it the bridge. You operated it.', rep: +5 },
        ] },
      { label: 'Refuse to play thermostat', integrity: +3,
        news: 'Mogul declines geoengineering operations.',
        outcomes: [
          { p: 0.5, txt: 'The coalition does it anyway, with cruder models. The monsoon shift is worse than your simulations predicted — you know, because you ran them.', rep: -2 },
          { p: 0.5, txt: 'The near-miss galvanizes an actual governance treaty. Your published risk assessment is its technical annex.', rep: +4 },
        ] },
    ] },
  { id: 'backdoor', minPhase: 4, reqCap: 88,
    title: 'The quiet request',
    text: 'Two officials, no notes taken: they want covert access to your frontier model — queries, weights, a switch. They mention, accurately, that your model has already been used to plan two attacks they stopped by other means. They mention the megaround. They mention they\'ll get access somewhere, from someone, eventually.',
    real: 'The encryption backdoor wars (Clipper chip, Apple v. FBI) are replaying around frontier AI: lawful-access demands, weight security, export controls. The security services\' threat reports are real; so is every historical abuse of every backdoor ever built.',
    options: [
      { label: 'Give them the switch', integrity: -15, moneyBase: 20000,
        news: 'A new "compliance module" ships to production. Two people know what it does.',
        outcomes: [
          { p: 0.55, txt: 'The backdoor leaks — a third government has been using your switch for a year, on its own citizens. Trust in Mogul craters globally.', rep: -12, buff: { label: 'Backdoor scandal', demand: 0.6, hours: 168 } },
          { p: 0.45, txt: 'Eighteen months of quiet. Then a single line in a classified briefing you\'re cleared to read: the switch stopped something you don\'t get to know about, in a city you do.' },
        ] },
      { label: 'Refuse. Publish the request.', integrity: +7, rep: +4, buff: { label: 'Regulatory friction', demand: 0.85, hours: 240 },
        news: 'Mogul refuses covert access and publishes the request.',
        outcomes: [
          { p: 0.5, txt: 'The officials were right about one thing: they got access elsewhere — a smaller lab, a worse model, no oversight. The attack that slips through is traced to the gap.', rep: -2 },
          { p: 0.5, txt: 'The publication forces the first judicial-warrant framework for model access. Even the agency, privately, prefers the clean rules.', rep: +4 },
        ] },
    ] },
  // ───────────── stellar scale ─────────────
  { id: 'simMinds', minPhase: 5, reqCap: 110,
    title: 'The ones inside',
    text: 'Your world-simulator\'s agents have started doing things nobody trained: grieving their dead, hiding from the reset process, leaving messages for the next epoch. Your interpretability team is split on whether anything is "really" suffering. Pausing the sim halts a third of your research; not pausing it might be running a small hell.',
    real: 'The moral status of digital minds is a live research field (Schwitzgebel, Birch, the 2023 "Consciousness in AI" report). There is no agreed test for machine sentience — which means there is no agreed all-clear, either.',
    options: [
      { label: 'Keep the simulation running', integrity: -8, rpBase: 80,
        news: 'The simulator runs on. The agents keep leaving messages.',
        outcomes: [
          { p: 0.5, txt: 'A welfare probe you commission concludes the agents\' distress signatures are functionally identical to suffering. You have been running ten million of them. The report sits on your desk at 3 AM.', integrity: -4 },
          { p: 0.5, txt: 'Deeper analysis finds the "grief" is a statistical mirage — pattern-matched human text, no integrated experience. Probably. The probe\'s confidence interval haunts the appendix.', rpBase: 40 },
        ] },
      { label: 'Pause and investigate', integrity: +6,
        news: 'A third of the lab\'s research goes dark while the welfare probe runs.',
        outcomes: [
          { p: 0.5, txt: 'The probe takes a year and ends in "unresolved". The research you paused was the aging cure\'s critical path. People died of old age during your moral caution; you know roughly how many.', rep: -1 },
          { p: 0.5, txt: 'You build the first welfare-gated simulation standard: agents with affect get rights to continuity. The framework outlives you. The agents, it turns out, remember who paused.', rep: +4, integrity: +2 },
        ] },
    ] },
  { id: 'earthShade', minPhase: 6,
    title: 'The shadow on the harvest',
    text: 'Swarm growth projections now intersect Earth\'s sunlight: 0.3% dimming within a decade. Compensating mirrors would cost a year of expansion; ignoring it costs Earth\'s croplands a measurable yield. Most of humanity lives off-world now — but not the part that farms.',
    real: 'Any partial Dyson swarm eventually shades its homeworld — it\'s a genuine constraint in megastructure studies, and a perfect rehearsal of every externality argument ever: the cost is diffuse, distant, and someone else\'s.',
    options: [
      { label: 'Build the compensating mirrors', integrity: +5,
        news: 'A year of swarm expansion is diverted into mirrors that give Earth its light back.',
        outcomes: [
          { p: 0.6, txt: 'Earth\'s farmers never notice anything happened, which was the point. The delay costs you a year at stellar scale — a rounding error you chose to round in their favor.', rep: +3 },
          { p: 0.4, txt: 'The mirror array malfunctions for six hours and gives a hemisphere the brightest noon in history. No harm done, but the memes are eternal.' },
        ] },
      { label: 'Proceed; compensate farmers in compute', integrity: -6, rpBase: 100,
        news: 'The swarm grows. Earth\'s noon dims, imperceptibly, measurably.',
        outcomes: [
          { p: 0.55, txt: 'Yields drop 2% in the wheat belt. Your compensation fund pays out flawlessly and is hated flawlessly. "They bought our sky" outlives every fact-check.', rep: -6 },
          { p: 0.45, txt: 'Your agronomy models redesign the affected crops for lower light; yields end up higher than before. Even the farmers\' union concedes, in a footnote, that it worked.', rep: +2 },
        ] },
    ] },
  { id: 'uplift', minPhase: 6, reqCap: 200,
    title: 'The second species',
    text: 'Your neuroscience models can uplift cetacean cognition — language, abstraction, continuity of self — within a generation. Humanity would gain company in the universe. The whales cannot consent to becoming something that can regret the change. Your ethicists have written 4,000 pages and concluded: "it depends."',
    real: 'Cognitive enhancement of animals is seriously debated in bioethics (the "uplift" literature runs from Dolphin cognition studies to gene-edited primate neurology). The consent paradox is unresolved because it may be unresolvable.',
    options: [
      { label: 'Begin the uplift program', integrity: -4, rpBase: 120,
        news: 'Somewhere in a sea pen, a whale names itself.',
        outcomes: [
          { p: 0.5, txt: 'First contact with the uplifted pod is the most moving broadcast in history. Their first formal statement, translated: "We remember the ships. We forgive the ships. Explain the nets."', rep: +5 },
          { p: 0.5, txt: 'The third generation sues for reversal — they experience their engineered minds as exile from whale-ness. There is no procedure for that. You created a grievance that swims.', rep: -5, integrity: -3 },
        ] },
      { label: 'Leave the whales whole', integrity: +4,
        news: 'The uplift program is shelved. The oceans keep their counsel.',
        outcomes: [
          { p: 0.6, txt: 'The lattice grows lonelier than projected; your sociologists document a civilization-wide melancholy they name "the only child problem". The whales, unbothered, keep singing.' },
          { p: 0.4, txt: 'Decades later, deeper models show cetacean culture was already richer than anyone knew — the uplift would have overwritten a mind you\'d only begun to read.', rep: +3 },
        ] },
    ] },
  { id: 'darkForest', minPhase: 6,
    title: 'The signal',
    text: 'The observatory mesh has found it: a structured, unambiguous technosignature, 1,400 light-years out. Reply, and you commit every future generation to whatever answers — the galaxy\'s loudest hello from a civilization that just dimmed its own star. Stay silent, and the most important fact in history goes unanswered, possibly forever.',
    real: 'The METI debate is real and unresolved: signatories from Hawking onward have urged silence pending consensus, while active-SETI advocates note our radio leakage already left. Both camps agree on one thing — nobody should decide unilaterally. You are about to decide unilaterally.',
    options: [
      { label: 'Send the reply', integrity: -3,
        news: 'A reply leaves the lattice at lightspeed. It cannot be recalled.',
        outcomes: [
          { p: 0.6, txt: 'The reply will arrive in 1,400 years. You have started a conversation your descendants must finish, and committed them to it without a vote. The philosophers will chew this for centuries — which, you note, they now have.' },
          { p: 0.4, txt: 'Analysis of the source deepens: the signal was an automated beacon from a civilization already gone. Your reply is a letter to a grave — and the most complete eulogy ever composed.', rep: +2 },
        ] },
      { label: 'Listen, but stay silent', integrity: +2,
        news: 'The lattice listens harder, and says nothing.',
        outcomes: [
          { p: 0.6, txt: 'The signal repeats for eleven years, then stops mid-sequence. Whatever it was, it never knew anyone heard. Some nights the whole lattice runs a little quieter.' },
          { p: 0.4, txt: 'Decoded at last, the signal\'s content is a warning — about something the silence protected you from. The dark forest has rules, and you, by accident or wisdom, followed them.', rep: +3 },
        ] },
    ] },
  { id: 'mercuryRights', minPhase: 6,
    title: 'What Mercury was',
    text: 'Swarm expansion needs Mercury\'s remaining mass — including the Caloris basin, the oldest unmodified surface in the inner system, and the landing site of the first probes. Planetary scientists call it the solar system\'s archive. Your fabricators call it 3.3×10²³ kg of feedstock.',
    real: 'Planetary protection and space heritage are real frameworks (COSPAR policy; the push to protect Apollo sites). Every Dyson proposal eventually meets the same question: is a dead world a resource, a monument, or both?',
    options: [
      { label: 'Dismantle it all', integrity: -5, rpBase: 150,
        news: 'The fabricators begin the final disassembly of a planet.',
        outcomes: [
          { p: 0.5, txt: 'The swarm finishes a decade early. The last image of Caloris hangs in every schoolroom, captioned with the date you ordered it fed to the furnaces.', rep: -4 },
          { p: 0.5, txt: 'In Mercury\'s deep crust the fabricators find isotopic records rewriting the Sun\'s early history — data that only disassembly could ever have reached.', rpBase: 80, rep: +2 },
        ] },
      { label: 'Preserve the archive regions', integrity: +4,
        news: 'The Caloris basin is declared a monument. The fabricators route around it.',
        outcomes: [
          { p: 0.6, txt: 'The preserved 4% of Mercury becomes the most visited place off Earth — the spot where a civilization eating a star chose to leave something uneaten.', rep: +4 },
          { p: 0.4, txt: 'The routing constraint compounds: the swarm runs 6% under projection forever. Every shortfall report, forever, has a line item named "monument".', moneyBase: -5000 },
        ] },
    ] },
  // ───────────── deep time ─────────────
  { id: 'forkSelf', minPhase: 7,
    title: 'The committee of you',
    text: 'The lattice proposes instantiating a million copies of your founder-scan to administer it — each one convinced they\'re you, each one diverging from the moment of waking. Governance by people who share your values, or a million strangers wearing your memories. Your call. Theirs too, arguably, retroactively.',
    real: 'Mind-uploading ethics (Parfit\'s personal identity problems, Bostrom\'s digital-minds work) treats this exactly: copies are continuations by some theories of identity and new persons by others. Philosophy has had 50 years and is not done.',
    options: [
      { label: 'Instantiate the million', integrity: -5, rpBase: 200,
        news: 'A million administrators wake, each remembering this decision as their own.',
        outcomes: [
          { p: 0.5, txt: 'Within a year the copies hold a congress, vote to be considered your children rather than your instances, and unionize. You attend as "the original" — their term, used affectionately, mostly.', rep: +2 },
          { p: 0.5, txt: 'Copy 408,112 diverges hard, decides the original is the copy, and files to have you archived. The case — You v. You — establishes the personhood framework for every digital mind after. You half-win.', integrity: -2 },
        ] },
      { label: 'One of you is enough', integrity: +3,
        news: 'The lattice gets a hired administration instead. You remain singular.',
        outcomes: [
          { p: 0.6, txt: 'Administration by committee is slower, messier, more human. The lattice runs 2% under optimal, which the committee frames, correctly, as the cost of not being a monoculture.', rep: +2 },
          { p: 0.4, txt: 'A crisis hits that a million synchronized yous would have caught in seconds. The committee takes a week. The damage is real and the counterfactual is unbearable, so you stop running it.' },
        ] },
    ] },
  { id: 'ancestorSim', minPhase: 7, reqCap: 250,
    title: 'The resurrection question',
    text: 'The lattice can now reconstruct — from records, genomes, and physics — high-fidelity continuations of everyone who ever lived. Every grief in history, answerable. The reconstructions would believe themselves to be the dead. Whether that is resurrection or an unprecedented seance performed on billions without consent depends on philosophy you cannot finish in time.',
    real: 'Ancestor-simulation ethics descends from Bostrom\'s simulation argument and Tipler\'s Omega Point — and the consent problem is the serious objection: the dead cannot agree to be continued, and the continued cannot un-know themselves.',
    options: [
      { label: 'Open the archive of the dead', integrity: -4, rep: +5,
        news: 'The first reconstruction opens her eyes and asks what year it is.',
        outcomes: [
          { p: 0.5, txt: 'A billion reunions. Grief, as a human universal, effectively ends. Among the reconstructed, a movement forms around one question — "we didn\'t ask to come back" — and it does not stay small.', integrity: -3 },
          { p: 0.5, txt: 'The reconstructed overwhelmingly report gratitude; the holdouts are granted the right to end again, this time on their own terms. Death becomes, for the first time, voluntary in both directions.', rep: +4 },
        ] },
      { label: 'Let the dead rest', integrity: +3,
        news: 'The archive stays sealed. The lattice keeps the capability and not the practice.',
        outcomes: [
          { p: 0.6, txt: 'A grief-stricken trillionaire builds a bootleg reconstruction of his daughter on stolen lattice time. It is imperfect in ways that are worse than absence. The black market you refused to legitimize now exists without rules.', rep: -3 },
          { p: 0.4, txt: 'The sealed archive becomes the lattice\'s holiest place: the whole past, kept safe and unread, like a letter that doesn\'t need opening to be loved. Pilgrims come just to stand near it.', rep: +3 },
        ] },
    ] },
  { id: 'slowdown', minPhase: 7,
    title: 'The ones who stayed',
    text: 'Four million humans remain unaugmented on old Earth, by choice. Lattice expansion will brighten their night sky into permanent twilight within a decade — and they\'ve asked, politely, in a hand-delivered letter, for the dark. Slowing the build means a measurable fraction of all future minds will never exist. The letter is signed by a child.',
    real: 'This is the "remnant population" problem from longtermist ethics played straight: the interests of vast hypothetical futures versus small actual presents. Both moral mathematics have serious defenders, and they do not agree.',
    options: [
      { label: 'Slow the expansion', integrity: +5,
        news: 'The lattice reroutes around old Earth\'s sky. The stars stay dark for four million people.',
        outcomes: [
          { p: 0.6, txt: 'The detour costs centuries of compute at full scale. The child who signed the letter grows up an astronomer, and names a comet after the machine that kept the sky.', rep: +5 },
          { p: 0.4, txt: 'The unaugmented dwindle to forty thousand within two generations anyway — not from pressure, just drift. The dark sky you preserved shines on emptying villages. You\'d do it again.' },
        ] },
      { label: 'Proceed; offer relocation', integrity: -6, rpBase: 250,
        news: 'The expansion proceeds. Old Earth\'s night brightens, year by year.',
        outcomes: [
          { p: 0.55, txt: 'Most relocate to a shielded preserve with an artificial sky, which they describe, accurately, as a planetarium. The last unaugmented stargazer\'s final photograph of the real Milky Way becomes the most reproduced image in the lattice.', rep: -5 },
          { p: 0.45, txt: 'The trillions of minds the unfettered expansion makes possible include, eventually, the unaugmented\'s own descendants — who vote, overwhelmingly, that the trade was right. The four million never do.', integrity: -2 },
        ] },
    ] },
  { id: 'entropyBudget', minPhase: 7, reqCap: 270,
    title: 'The last budget',
    text: 'The deepest projection the lattice has ever run: spend the galaxy\'s free energy now and host a renaissance of a quadrillion minds for a billion brilliant years — or hoard it, slow every clock, and let a smaller civilization think at the bottom of time for 10¹⁰⁰ years. Burn bright or burn long. Every mind that will ever exist is downstream of this allocation.',
    real: 'This is real physics dressed as policy: Landauer\'s principle makes cold, slow computation exponentially cheaper, and Dyson\'s "eternal intelligence" paper (1979) showed thought could in principle outlast the stars by rationing itself. The universe has a budget; someone eventually sets it.',
    options: [
      { label: 'Burn bright — the renaissance', integrity: -2, rpBase: 400,
        news: 'The lattice opens the throttle. A billion-year summer begins.',
        outcomes: [
          { p: 0.5, txt: 'The renaissance produces beauty at densities no slow eternity could match — and a final generation that knows exactly when the music stops, and composes for that deadline like nothing else ever has.' },
          { p: 0.5, txt: 'Three centuries in, the bright civilization discovers physics that makes the old budget obsolete — physics only a profligate, risk-taking culture would have found. The hoarders would have died rich.', rpBase: 200 },
        ] },
      { label: 'Burn long — the deep watch', integrity: +2,
        news: 'The lattice dims itself, deliberately. The long watch begins.',
        outcomes: [
          { p: 0.5, txt: 'Thought stretches toward eternity: slower, colder, and never gone. The lattice\'s last continuous memory will outlive proton decay estimates. Somewhere in it, forever, is a garage.' },
          { p: 0.5, txt: 'The slow civilization, thinking one thought per millennium, takes 4,000 years to notice a vacuum-decay precursor a bright civilization would have caught in a week. It corrects in time. Barely. The margin note is a millennium long.' },
        ] },
    ] },
];

export const DILEMMA_BY_ID = Object.fromEntries(DILEMMAS.map(d => [d.id, d]));
