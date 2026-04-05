let img_navbar;
let img_adBanner;
let img_product;
let img_gnb;
let img_aiIcon;
let img_green;
let img_textBox;

let state = 0;

let apiKey = "AIzaSyDCRy6q-uzSpFaCbk28mSyb0x_5Lu7DoQk";


const systemPrompt =
    "You are a helpful AI assistant; given the information in the PDF file, please provide accurate responses in fewer than three sentences.";
let conversationHistory = [];
let ai_response;

let pdfInput;
let encodedPDF = null;
let pdfAdded = false;

function preload() {
    img_navbar = loadImage("01_NavBar.png");
    img_adBanner = loadImage("02_AdBanner.png");
    img_product = loadImage("03_Product.png");
    img_gnb = loadImage("04_GNB.png");
    img_aiIcon = loadImage("05_ai_icon.png");
    img_green = loadImage("06_green.png");
    img_textBox = loadImage("07_textbox.png");
}

function setup() {
    createCanvas(393, 852);

    if (!("webkitSpeechRecognition" in window)) {
        console.log("Speech recognition is not supported in this browser.");
        noLoop();
    } else {
        speechRecognition = new webkitSpeechRecognition();
        speechRecognition.lang = "ko-KR";
        speechRecognition.continuous = true;
        speechRecognition.onresult = speechResult;
    }

    pdfInput = createFileInput(handleFile);
    pdfInput.attribute("accept", ".pdf");
    pdfInput.style("opacity", "0");
    pdfInput.style("position", "absolute");
    pdfInput.position(0, 0);
    pdfInput.size(width, 100);
}

function draw() {
    background(255);
    if (state == 0) {
        image(img_navbar, 0, 0, 393, 128);
        image(img_adBanner, 0, 128, 393, 284);
        image(img_product, 0, 412, 393, 440);
        image(img_gnb, 0, 764, 393, 88);
        image(img_aiIcon, 320, 688, 60, 60);
    } else if (state == 1) {
        image(img_navbar, 0, 0, 393, 128);
        image(img_adBanner, 0, 128, 393, 284);
        image(img_product, 0, 412, 393, 440);
        image(img_green, 0, 612, 393, 152);
        image(img_gnb, 0, 764, 393, 88);
        image(img_aiIcon, 320, 688, 60, 60);
    } else if (state == 2) {
        image(img_navbar, 0, 0, 393, 128);
        image(img_adBanner, 0, 128, 393, 284);
        image(img_product, 0, 412, 393, 440);
        image(img_textBox, 27, 176, 340, 514);
        image(img_gnb, 0, 764, 393, 88);
        image(img_aiIcon, 320, 688, 60, 60);

        fill(255);
        textSize(18);
        textAlign(CENTER, CENTER);
        textWrap(WORD);
        text(ai_response, 47, height / 2, 300);
    }
}

function mouseClicked() {
    if (mouseX >= 320 && mouseX <= 380) {
        if (mouseY >= 688 && mouseY <= 748) {
            if (state == 0) {
                state = 1;
                startSpeechRecognition();
            } else if (state == 1) {
                state = 0;
            } else if (state == 2) {
                state = 0;
            }
        }
    }
}

function startSpeechRecognition() {
    if (speechRecognition) {
        speechRecognition.start();
    }
}

function speechResult(event) {
    let speechInput = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");

    if (event.results[event.results.length - 1].isFinal) {
        generateResponse(speechInput);
        speechRecognition.stop();
    }
}

async function generateResponse(question) {
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let systemInstruction = systemPrompt;

    if (encodedPDF && !pdfAdded) {
        conversationHistory.push({
            role: "user",
            parts: [
                {
                    inline_data: {
                        mime_type: "application/pdf",
                        data: encodedPDF,
                    },
                },
            ],
        });
        pdfAdded = true;
    }

    conversationHistory.push({ role: "user", parts: [{ text: question }] });

    let requestBody = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: conversationHistory,
    };

    try {
        let response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        let data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            responseText = data.candidates[0].content.parts[0].text;
        } else {
            responseText = "No response received.";
        }

        console.log("Answer:", responseText);
        ai_response = responseText;
        speakText(responseText);
        state = 2;

        conversationHistory.push({
            role: "model",
            parts: [{ text: responseText }],
        });
    } catch (error) {
        console.log("Error: " + error.message);
    }
}

function handleFile(file) {
    if (
        file.type === "application/pdf" ||
        (file.name && file.name.toLowerCase().endsWith(".pdf"))
    ) {
        let reader = new FileReader();
        reader.onload = function (e) {
            let dataUrl = e.target.result;
            encodedPDF = dataUrl.split(",")[1];
            pdfAdded = false;
        };
        reader.readAsDataURL(file.file);
    } else {
        console.log("Uploaded file is not a PDF.");
    }
}

async function speakText(text) {
  const ttsUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text }]
      }
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore"
          }
        }
      }
    }
  };

  try {
    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    console.log("TTS status:", response.status);

    const data = await response.json();
    console.log("TTS full response:", data);

    if (!response.ok) {
      console.log("Gemini TTS error:", data?.error?.message || "unknown");
      return;
    }

    const audioBase64 =
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
      data?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!audioBase64) {
      console.log("No audio returned");
      return;
    }

    // base64 -> Uint8Array (raw PCM)
    const pcmBytes = base64ToUint8Array(audioBase64);

    // PCM -> WAV Blob
    const wavBlob = pcmToWavBlob(pcmBytes, 24000, 1, 16);

    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);

    audio.onplay = () => console.log("Audio started");
    audio.onended = () => {
      console.log("Audio ended");
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = (e) => console.log("Audio error:", e);

    await audio.play();
  } catch (error) {
    console.log("TTS fetch error:", error.message);
  }
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

function pcmToWavBlob(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const blockAlign = numChannels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // fmt chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // PCM bytes
  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([buffer], { type: "audio/wav" });
}
