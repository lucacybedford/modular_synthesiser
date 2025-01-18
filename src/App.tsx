import './App.css'
import {ReactElement, useEffect, useState} from "react";
import keyboardMockup from './assets/keyboard.png';

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


function noteOn(note: number, velocity: number, octave: number = 0){
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
        osc.frequency.value = midiToFreq(note + octave * 12);
        osc.connect(oscGain);
        oscGain.connect(velocityGain);
        velocityGain.connect(
            osc.frequency
        );

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

const keyToNote: { [key: string]: number } = {
    q: 48, // C3
    2: 49, // C#3
    w: 50, // D3
    3: 51, // D#3
    e: 52, // E3
    r: 53, // F3
    5: 54, // F#3
    t: 55, // G3
    6: 56, // G#3
    y: 57, // A3
    7: 58, // A#3
    u: 59, // B3
    i: 60, // Middle C4
    9: 61, // C#4
    o: 62, // B4
    0: 63, // B#4
    p: 64, // E4
    z: 65, // F4
    s: 66, // F#4
    x: 67, // G4
    d: 68, // G#4
    c: 69, // A4
    f: 70, // A#4
    v: 71, // B4
    b: 72, // C5
    h: 73, // C#5
    n: 74, // D5
    j: 75, // D#5
    m: 76, // E5
};

function App(): ReactElement {
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
    const [octave, setOctave] = useState(0);
    const [isMIDICompatible, setIsMIDICompatible] = useState(true);

    useEffect(() => {
        if (!navigator.requestMIDIAccess) {
            setIsMIDICompatible(false);
            console.error("Web MIDI API is not supported in this browser.");
        }
    }, []);



    navigatorBegin();



    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key == 'ArrowDown') {
                console.log("octave down");
                setOctave(octave - 1);
            } else if (event.key == 'ArrowUp') {
                setOctave(octave + 1);
            } else {
                const note = keyToNote[event.key];
                if (note && !pressedKeys.has(event.key)) {
                    setPressedKeys((prev) => new Set(prev).add(event.key));
                    noteOn(note, 127, octave);
                }
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key != 'ArrowDown' && event.key != 'ArrowUp') {
                const note = keyToNote[event.key];
                if (note) {
                    setPressedKeys((prev) => {
                        const updated = new Set(prev);
                        updated.delete(event.key);
                        return updated;
                    });
                    noteOff(note);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [pressedKeys, octave]);


    return (
        <>
            <h1>SynthWeb</h1>
            <h2>Modular Synthesiser</h2>
            <div className="keyboard-mockup">
                <img
                    src={keyboardMockup}
                    alt="Keyboard Mockup"
                    style={{
                        width: '100%',  // Adjust as needed
                        maxWidth: '800px',  // Keep the image responsive
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto',
                    }}
                />
            </div>
            <div className="card">

                <div className={"oscillator"}>
                    <label className={"waveform_item"}>Select Waveform: </label>
                    <select className={"waveform_item"} id="waveform">
                        <option value='sine'>Sine</option>
                        <option value='square'>Square</option>
                        <option value='sawtooth'>Saw</option>
                        <option value='triangle'>Triangle</option>
                    </select>
                </div>

                <div className={"oscillator"}>
                    <div className={"osc_container"}>
                        <div className={"effect_select"}>
                            <label className={"waveform_item"}>Select Effect: </label>
                            <select id="effect_1" className={"waveform_item"}>
                                <option value='none'>None</option>
                                <option value='lowpass'>Lowpass</option>
                                <option value='highpass'>Highpass</option>
                                <option value='bandpass'>Bandpass</option>
                                <option value='notch'>Notch</option>
                            </select>
                        </div>
                        <input
                            className={"effect_select"}
                            type="range"
                            id="effect_1_slider"
                            min="20"
                            max="20000"
                            defaultValue="10000"
                        />
                    </div>
                </div>
                <div className={"oscillator"}>
                    <div className={"osc_container"}>
                        <div className={"effect_select"}>
                            <label className={"waveform_item"}>Select Effect: </label>
                            <select id="effect_2" className={"waveform_item"}>
                                <option value='none'>None</option>
                                <option value='lowpass'>Lowpass</option>
                                <option value='highpass'>Highpass</option>
                                <option value='bandpass'>Bandpass</option>
                                <option value='notch'>Notch</option>
                            </select>
                        </div>
                        <div className={"effect_slider"}>
                            <input
                                type="range"
                                id="effect_2_slider"
                                min="20"
                                max="20000"
                                defaultValue="10000"
                            />
                        </div>
                    </div>
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
            {!isMIDICompatible && (
                <div className="midi_warning">
                    <p>
                        This browser does not support the Web MIDI API.
                    </p>
                </div>
            )}
        </>
    )
}

export default App
