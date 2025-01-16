import './App.css'
import {ReactElement, useEffect, useState} from "react";

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
        console.log("creating note:", note);
        const osc = ctx.createOscillator();


        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.2;

        const velocityGainAmount = velocity / 127;
        const velocityGain = ctx.createGain();
        velocityGain.gain.value = velocityGainAmount;

        osc.type = getValue();
        osc.frequency.value = midiToFreq(note);

        const connectionChain: (OscillatorNode | GainNode | BiquadFilterNode | AudioDestinationNode)[] = [osc, oscGain, velocityGain];

        const effect1 = getEffect("effect_1");
        if (effect1 != "none") {
            const biquadFilter1 = ctx.createBiquadFilter();
            biquadFilter1.type = effect1 as BiquadFilterType;
            biquadFilter1.frequency.setValueAtTime(getEffectValue("effect_1_slider"), ctx.currentTime);
            connectionChain.push(biquadFilter1);
        }


        const effect2 = getEffect("effect_2");
        if (effect2 != "none") {
            const biquadFilter2 = ctx.createBiquadFilter();
            biquadFilter2.type = effect2 as BiquadFilterType;
            biquadFilter2.frequency.setValueAtTime(getEffectValue("effect_2_slider"), ctx.currentTime);
            connectionChain.push(biquadFilter2);
        }

        connectionChain.push(ctx.destination);


        for (let i = 0; i < connectionChain.length-1; i++) {
            const first = connectionChain[i];
            const second = connectionChain[i+1];
            first.connect(second);
        }

        oscillators[note.toString()] = {oscillator: osc, gain: oscGain};

        osc.start();
    }
}

function getValue(): OscillatorType {
    return (document.getElementById("waveform") as HTMLSelectElement).value as OscillatorType;
}

function getEffect(effect: string): string {
    return (document.getElementById(effect) as HTMLSelectElement).value;
}

function getEffectValue(effect: string): number {
    return parseInt((document.getElementById(effect) as HTMLSelectElement)?.value);
}

function getSustain(): number {
    return parseFloat((document.getElementById("sustain_time") as HTMLSelectElement).value);
}

function noteOff(note: number) {
    const osc = oscillators[note.toString()]?.oscillator;
    const oscGain = oscillators[note.toString()]?.gain;
    const trailTime = getSustain();

    const curve = new Float32Array([oscGain?.gain.value, 0]);
    oscGain?.gain.setValueCurveAtTime(curve, ctx.currentTime, trailTime);
    oscGain?.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + trailTime);

    setTimeout(() => {
        osc?.stop();
        osc?.disconnect();
    }, trailTime * 1000 + 10);
    delete oscillators[note.toString()];
    console.log("Note off");
}


function updateDevices(event: MIDIConnectionEvent) {
    console.log(`Name: ${event.port?.name}$, Brand: ${event.port?.manufacturer}$, State: ${event.port?.state}$, Type: ${event.port?.type}$`);
}

function handleInput(input: MIDIMessageEvent) {
    if (input.data) {
        const command = input.data[0];
        const note = input.data[1];
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

// Mapping of keyboard keys to MIDI note numbers
const keyToNote: { [key: string]: number } = {
    a: 60, // Middle C (C4)
    w: 61, // C#4
    s: 62, // D4
    e: 63, // D#4
    d: 64, // E4
    f: 65, // F4
    t: 66, // F#4
    g: 67, // G4
    y: 68, // G#4
    h: 69, // A4
    u: 70, // A#4
    j: 71, // B4
    k: 72, // C5
};

function App(): ReactElement {
    if (!navigator.requestMIDIAccess) {
        console.error("Web MIDI API is not supported in this browser.");
    }

    navigatorBegin();

    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const note = keyToNote[event.key];
            if (note && !pressedKeys.has(event.key)) {
                setPressedKeys((prev) => new Set(prev).add(event.key));
                noteOn(note, 127);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            const note = keyToNote[event.key];
            if (note) {
                setPressedKeys((prev) => {
                    const updated = new Set(prev);
                    updated.delete(event.key);
                    return updated;
                });
                noteOff(note);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [pressedKeys]);


    return (
        <>
            <h1>Modular Synthesiser</h1>
            <p>Use the keys A, W, S, E, D, F, T, G, Y, H, U, J, K to play notes.</p>
            <div className="card">
                <div id={"oscillator"}>
                    <label htmlFor="waveform">Select Waveform: </label>
                    <select id="waveform">
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
                    </select>
                    <input
                        type="range"
                        id="effect_1_slider"
                        min="20"
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
                    </select>
                    <input
                        type="range"
                        id="effect_2_slider"
                        min="20"
                        max="20000"
                        defaultValue="10000"
                    />
                </div>
                <div id={"sustain"}>
                    <label htmlFor="sustain">Sustain (s): </label>
                    <input
                        type="range"
                        id="sustain_time"
                        min="0.03"
                        max="3"
                        step="0.01"
                        defaultValue="0.03"
                    />
                </div>
            </div>
        </>
    )
}

export default App
