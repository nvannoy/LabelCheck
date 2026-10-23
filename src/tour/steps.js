// The tour, step by step. target is a CSS selector for the part of the screen to point at
// (none means the card sits in the middle). screen says which screen the step needs;
// focus names the review row to open. Plain wording, no jargon.
export const TOUR_STEPS = [
  {
    id: 'welcome', screen: 'intake', target: null, sample: false,
    title: 'Welcome to Label check',
    text: 'A short tour with a made-up sample label. It shows how to check a label against its application, and what the app will and will not do for you. Nothing here is saved or sent anywhere.',
  },
  {
    id: 'image', screen: 'intake', target: '.picked', sample: true,
    title: '1. The label image',
    text: 'In real use, paste the label picture (Ctrl+V or Cmd+V) or drop it anywhere on the page. Reading starts the moment it arrives. This sample is already loaded.',
  },
  {
    id: 'text', screen: 'intake', target: '[aria-labelledby="step2"]', sample: true,
    title: '2. The application text',
    text: 'Copy the whole application and paste it. You do not need to click a box first. The app finds the fields it needs and shows what it found. You can edit any of them.',
  },
  {
    id: 'start', screen: 'intake', target: '.start', sample: true,
    title: 'Start the review',
    text: 'Press Start review, or just press Enter. Next, the tour opens the review of this sample.',
  },
  {
    id: 'tier', screen: 'review', target: '.tier', sample: true,
    title: 'The first answer',
    text: 'Likely reject, Needs review or Ready to approve. This sample is a Likely reject because one field clearly differs. The app never approves a label for you. It only tells you where to look.',
  },
  {
    id: 'label', screen: 'review', target: '.imageblock', sample: true,
    title: 'The label and its boxes',
    text: 'Each number is a field the app found, with a box around it. Use the zoom buttons below the label to read small print. Zoom to field jumps to the field you are looking at.',
  },
  {
    id: 'rows', screen: 'review', target: '.rows', sample: true,
    title: 'One row per field',
    text: 'Use the up and down arrow keys, or Tab, to move through the fields. No click is needed. Enter marks a field reviewed. Match is a solid check, Check is a dashed question mark, Mismatch is a thick cross.',
  },
  {
    id: 'mismatch', screen: 'review', target: '.row.focused', sample: true, focus: 'netContents',
    title: 'A mismatch',
    text: 'The label says 750 mL and the application says 700 mL. You see both side by side and a reason in plain words. Numbers are compared exactly.',
  },
  {
    id: 'warning', screen: 'review', target: '.row.focused', sample: true, focus: 'warning',
    title: 'The government warning',
    text: 'The wording is checked word for word against the law. The app also estimates whether the title is bold. What it cannot judge, such as legibility, it lists for you to check by eye.',
  },
  {
    id: 'decision', screen: 'review', target: '.decision', sample: true,
    title: 'You decide',
    text: 'Label verified or Issues found are your buttons. Verifying a Likely reject label asks you to confirm first. You get notes you can edit and copy. Next label clears everything: nothing is kept.',
  },
  {
    id: 'done', screen: 'review', target: null, sample: true,
    title: 'That is the tour',
    text: 'Close the tour to start with your own label. The Tour button on the first screen brings it back.',
  },
]
