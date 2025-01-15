import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {ReactElement} from "react";

type WrappedOsc = {
    oscillator: OscillatorNode;
    gain: GainNode;
};

const ctx: AudioContext = new AudioContext();

const oscillators = {} as { [key: string]: WrappedOsc };

function midiToFreq(number: number) {
    const a = 440;
    return (a/32) * (2 ** ((number - 9) / 12));
}


function noteOn(note: number, velocity: number){
    // create the oscillator for that note
    if (ctx) {
        console.log("creating note");
        const osc = ctx.createOscillator();


        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.25;

        const velocityGainAmount = velocity / 127;
        const velocityGain = ctx.createGain();
        velocityGain.gain.value = velocityGainAmount;


        osc.type = getValue();
        osc.frequency.value = midiToFreq(note);

        const biquadFilter = ctx.createBiquadFilter();
        biquadFilter.type = getEffect("effect_1");
        biquadFilter.frequency.setValueAtTime(getEffectValue("effect_1_slider"), ctx.currentTime + 1);

        const biquadFilter2 = ctx.createBiquadFilter();
        biquadFilter2.type = getEffect("effect_2");
        biquadFilter2.frequency.setValueAtTime(getEffectValue("effect_2_slider"), ctx.currentTime + 1);

        osc.connect(oscGain);
        oscGain.connect(velocityGain);
        velocityGain.connect(biquadFilter);
        biquadFilter.connect(biquadFilter2);
        biquadFilter2.connect(ctx.destination);

        oscillators[note.toString()] = {oscillator: osc, gain: oscGain};
        console.log(oscillators);

        osc.start();
    }
}

function getValue(): OscillatorType {
    return (document.getElementById("waveform") as HTMLSelectElement).value as OscillatorType;
}

function getEffect(effect: string): BiquadFilterType {
    return (document.getElementById(effect) as HTMLSelectElement).value as BiquadFilterType;
}

function getEffectValue(effect: string): number {
    return parseInt((document.getElementById(effect) as HTMLSelectElement)?.value);
}

function noteOff(note: number) {
    const osc = oscillators[note.toString()]?.oscillator;
    const oscGain = oscillators[note.toString()]?.gain;
    const trailTime = 0.03;

    const curve = new Float32Array([oscGain?.gain.value, 0]);
    oscGain?.gain.setValueCurveAtTime(curve, ctx.currentTime, trailTime);
    oscGain?.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + trailTime);

    setTimeout(() => {
        osc?.stop();
        osc?.disconnect();
    }, trailTime * 1000 + 10);
    delete oscillators[note.toString()];
    console.log(oscillators);
    console.log(oscillators[0]?.oscillator);


    if (oscillators) {
        console.log(oscillators);
    }
}


function updateDevices(event: MIDIConnectionEvent) {
    console.log(`Name: ${event.port?.name}$, Brand: ${event.port?.manufacturer}$, State: ${event.port?.state}$, Type: ${event.port?.type}$`);
}

function handleInput(input: MIDIMessageEvent) {
    if (input.data) {
        const command = input.data[0];
        const note = input.data[1];
        if (command == 144 || command == 128) {
            console.log(input.data);
        }
        if (command == 144) {
            const velocity = input.data[2];
            if (velocity > 0) {
                noteOn(note, velocity);
            }
        } else if (command == 128) {
            noteOff(note);
        }
    }
}

function success(midiAccess: MIDIAccess) {
    console.log("success");
    midiAccess.addEventListener('statechange', (e) => updateDevices(e as MIDIConnectionEvent));

    const inputs = midiAccess.inputs;

    inputs.forEach((input) => {
        input.addEventListener('midimessage', handleInput)
    });
}

function failure() {
    console.log("Failed ");
}

function navigatorBegin() {
    console.log("navigatorBegin");
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(success, failure);
    }
}




function App(): ReactElement {
    if (!navigator.requestMIDIAccess) {
        console.error("Web MIDI API is not supported in this browser.");
    }

    navigatorBegin();

    return (
        <>
            <div>
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <div id={"oscillator"}>
                    <label htmlFor="waveform">Select Waveform: </label>
                    <select
                        id="waveform"
                    >
                        <option value='sine'>Sine</option>
                        <option value='square'>Square</option>
                        <option value='sawtooth'>Saw</option>
                        <option value='triangle'>Triangle</option>
                    </select>
                </div>
                <div id={"oscillator"}>
                    <label htmlFor="effect_1">Select Effect: </label>
                    <select id="effect_1">
                        <option value='none'>None</option>
                        <option value='lowpass'>Lowpass</option>
                        <option value='highpass'>Highpass</option>
                        <option value='bandpass'>Bandpass</option>
                        <option value='notch'>Notch</option>
                        <option value='lowshelf'>Lowshelf</option>
                        <option value='highshelf'>Highshelf</option>
                    </select>
                    <input
                        type="range"
                        id="effect_1_slider"
                        min="40"
                        max="20000"
                        defaultValue="10000"
                    />
                </div>
                <div id={"oscillator"}>
                    <label htmlFor="effect_2">Select Effect: </label>
                    <select id="effect_2">
                        <option value='none'>None</option>
                        <option value='lowpass'>Lowpass</option>
                        <option value='highpass'>Highpass</option>
                        <option value='bandpass'>Bandpass</option>
                        <option value='notch'>Notch</option>
                        <option value='lowshelf'>Lowshelf</option>
                        <option value='highshelf'>Highshelf</option>
                    </select>
                    <input
                        type="range"
                        id="effect_2_slider"
                        min="0"
                        max="100"
                        defaultValue="50"
                    />
                </div>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </>
    )
}

export default App
