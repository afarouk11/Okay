// Utility: Converts LaTeX math to spoken English for ElevenLabs TTS
// Always ends with 'Sir.'

const latexToSpeech = (input: string): string => {
  let out = input
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, 'the fraction $1 over $2')
    .replace(/\\int_([a-zA-Z0-9]+)\^([a-zA-Z0-9]+) ([^ ]+) \, dt/g, 'the definite integral of $3 with respect to t, evaluated from $1 to $2')
    .replace(/\\int/g, 'the integral')
    .replace(/\\sum/g, 'the sum')
    .replace(/\\sqrt{([^}]+)}/g, 'the square root of $1')
    .replace(/\\left\(|\\right\)/g, '')
    .replace(/\^([0-9]+)/g, ' to the power of $1')
    .replace(/_([a-zA-Z0-9]+)/g, ' sub $1')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\/g, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ');
  out = out.replace(/\s*$/, ', Sir.');
  return out;
};

export default latexToSpeech;
