/** Story content, notes, texts, endings for Static Hours */

export const NOTES = {
  sticky_fridge: {
    id: 'sticky_fridge',
    title: 'Sticky Note',
    body: `DON'T answer if they knock after midnight.\n\nYou said that last time.\nYou answered.\n\n— M`,
  },
  lease: {
    id: 'lease',
    title: 'House Rules (printed)',
    body: `SHORT-TERM RENTAL — Unit 7B "The Hollow Place"\n\n• Quiet hours: 10pm – 8am\n• No parties. No overnight guests without notice.\n• Fuse box: basement landing, left wall.\n• Wi-Fi: HollowGuest / static4hours\n• If you hear scratching in the walls: it's raccoons. Probably.\n\nCheckout is 11am. Keys in the dish by the door.\n\n(Handwritten at bottom, different ink:)\nThey never leave by 11.`,
  },
  journal1: {
    id: 'journal1',
    title: 'Torn Journal Page',
    body: `Day 3 without.\nHands won't stop. Clock says 2:14. Phone says 4:07. The microwave says --:--.\n\nI came here to "get clean." Rural. No dealers. No friends.\nJust trees and a house that smells like other people's sweat.\n\nSomething moved the chair when I was in the bathroom.\nOr I moved it and forgot.\nSame difference, these days.`,
  },
  bathroom_mirror: {
    id: 'bathroom_mirror',
    title: 'Fogged Mirror Note',
    body: `(Written in condensation — still faintly visible)\n\nWHO IS WATCHING\nFROM THE OTHER SIDE\n\n(Below, in smaller letters:)\nyou are`,
  },
  pharmacy: {
    id: 'pharmacy',
    title: 'Pharmacy Receipt',
    body: `NORTH RIDGE PHARMACY\n09/12 — 11:48 PM\n\nIBUPROFEN 200MG ........ $6.49\nELECTROLYTE PACK ...... $4.99\n\n* DECLINED — CARD LIMIT\n* CASH: $12.00\nCHANGE: $0.52\n\nCashier note: "You okay, hon?"\n\n(On the back, your handwriting:)\nShe looked at me like she knew.\nLike she'd seen this face before.`,
  },
  basement_note: {
    id: 'basement_note',
    title: 'Yellowed Index Card',
    body: `FREQUENCY LOG — previous tenant\n\n89.3  — static / breathing?\n91.7  — children's choir (no station listed)\n94.0  — our voices, delayed 3 seconds\n97.1  — nothing. Too quiet. Don't stay.\n102.4 — THE KNOCKING MATCHES\n\nIf it calls your name: turn it off.\nIf it calls your name in your voice: leave the house.`,
  },
  bedroom_letter: {
    id: 'bedroom_letter',
    title: 'Unsent Letter',
    body: `M—\n\nI rented this place so I wouldn't call you.\nSo I wouldn't show up at 3am smelling like\nmetal and apologies.\n\nIt's worse alone. The walls remember\nhow many people have sweated this out.\n\nThere's a crawlspace behind the linen closet.\nI found polaroids. Faces I don't know.\nOne of them looks like me on a bad night.\n\nIf I don't text by morning, don't come.\nI mean it this time.\n\n— me`,
  },
  office_email: {
    id: 'office_email',
    title: 'Printed Email',
    body: `From: noreply@hollowplace.rentals\nTo: [redacted]\nSubject: Re: Noise complaint — Unit 7B\n\nHi,\n\nWe've received reports of "pacing" and\n"talking to someone who isn't there" between\n1–5 AM. As a reminder, overnight guests must\nbe registered.\n\nAlso: please do not adjust the basement radio.\nIt's part of the property's... character.\n\nRegards,\nManagement\n\nP.S. The previous guest left early.\nThey said the clocks were lying.`,
  },
  cryptic_polaroid: {
    id: 'cryptic_polaroid',
    title: 'Polaroid — Hidden',
    body: `[A washed-out photo of this living room.\nSomeone sits on the couch facing away.\nThe timestamp in the corner: tonight.\nThe clock on the wall in the photo: 3:33.\n\nOn the white border, in pencil:]\n\nYOU ALREADY ANSWERED.\nTHIS IS THE ECHO.`,
  },
  crawl_scrawl: {
    id: 'crawl_scrawl',
    title: 'Wall Scrawl',
    body: `(Carved into the crawlspace beam)\n\nSTAY = ROT\nLEAVE = HUNT\nANSWER = BECOME\n\nTHERE IS NO CLEAN EXIT\nONLY WHICH DIRTY ONE YOU PICK`,
  },
  fuse_hint: {
    id: 'fuse_hint',
    title: 'Fuse Box Label',
    body: `MAIN · KITCHEN · HALL · UPSTAIRS · BASEMENT · SPARE\n\n(Duct-taped scrap:)\nPower's been weird since the last one.\nFlip MAIN last. Always.\nIf the lights come back wrong —\ndon't look at the windows.`,
  },
  text_thread: {
    id: 'text_thread',
    title: 'Phone',
    isPhone: true,
    messages: [
      { from: 'M', text: 'Did you make it okay?', time: '9:41 PM', me: false },
      { from: 'You', text: 'yeah. place is empty. weird quiet.', time: '9:44 PM', me: true },
      { from: 'M', text: 'Drink water. Eat something. Call if it gets bad.', time: '9:45 PM', me: false },
      { from: 'You', text: 'I wont call. thats the point', time: '9:46 PM', me: true },
      { from: 'M', text: 'Okay. Just… lock the doors.', time: '9:47 PM', me: false },
      { from: 'Unknown', text: 'you left the porch light on', time: '11:02 PM', me: false },
      { from: 'You', text: 'who is this', time: '11:03 PM', me: true },
      { from: 'Unknown', text: 'you know who', time: '11:03 PM', me: false },
      { from: 'Unknown', text: 'come downstairs when youre ready', time: '2:14 AM', me: false },
      { from: 'M', text: 'Hey. You awake? Had a weird dream about your rental.', time: '2:16 AM', me: false },
      { from: 'Unknown', text: 'she cant help you from there', time: '2:17 AM', me: false },
    ],
  },
};

export const ENDINGS = {
  stay: {
    tag: 'Ending — Stay',
    title: 'The Long Night',
    body: `You lock every door. You sit on the floor with your back to the wall and wait for dawn.\n\nDawn does not come on time.\nThe windows stay the color of bruises.\nYour phone dies at 4:07 and somehow still buzzes.\n\nWhen the knocking finally stops, something is already inside the quiet with you.\nIt learned your breathing. It matches it.\n\nYou stay until you forget which set of lungs is yours.`,
  },
  leave: {
    tag: 'Ending — Leave',
    title: 'Into the Trees',
    body: `You take the keys. You do not look at the windows. You walk into the rain until the house is a smudge behind the pines.\n\nYour phone finds one bar. M answers on the first ring.\nYou try to explain. The words come out in the wrong order.\n\nSomewhere behind you, a porch light clicks on.\nYou did not leave it on.\n\nYou keep walking. Something keeps the same pace, just past the edge of the flashlight.`,
  },
  answer: {
    tag: 'Ending — Answer',
    title: 'Threshold',
    body: `You open the door.\n\nThere is no face — only the shape of a person made of hallway dark and the smell of your own sweat from worse nights.\nIt does not speak. It does not need to.\n\nYou understand, with the clarity of a fever breaking, that this is what the comedown was for: to thin you out until something else could wear the gap.\n\nIn the morning the house is quiet.\nA new guest arrives at 2 PM.\nThe keys are in the dish.\nSomeone has already been pacing upstairs.`,
  },
};

export const OBJECTIVES = {
  start: 'Find your phone. Get your bearings.',
  explore: 'Explore the ground floor. Something feels off.',
  power: 'The power is wrong. Find the fuse box.',
  upstairs: 'Check upstairs. Look for anything useful.',
  basement: 'The basement door is open now. Go down.',
  evidence: 'Collect what you can. Understand what this place wants.',
  climax: 'Someone is at the door. Decide.',
  eggs: 'There are things this house hides from casual eyes.',
};

export const PHONE_PUSHES = [
  { at: 'after_wake', from: 'Unknown', msg: 'you left the porch light on' },
  { at: 'after_power', from: 'Unknown', msg: 'better. now we can see each other' },
  { at: 'after_upstairs', from: 'M', msg: 'Please text me back. I mean it.' },
  { at: 'before_climax', from: 'Unknown', msg: 'im at the door. you know the rules.' },
];
