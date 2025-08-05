(async function () {
	const COOKIE_NAME = 'age_verified';
	const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
	let USE_FACE_DETECTION = (typeof faceapi !== 'undefined');

	function setCookie(name, value, maxAgeSeconds) {
		document.cookie = `${name}=${value};path=/;max-age=${maxAgeSeconds}`;
	}
	function getCookie(name) {
		const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
		return match ? match[2] : null;
	}

	async function initFaceApi() {

		USE_FACE_DETECTION = (typeof faceapi !== 'undefined');

        if (USE_FACE_DETECTION) {
            await faceapi.nets.tinyFaceDetector.loadFromUri(
                'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.3/model/'
            );
        }

	}

	function createModal() {
		const modal = document.createElement('div');
		modal.id = 'age-verification-modal';
		Object.assign(modal.style, {
			position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
			background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '9999'
		});
		modal.innerHTML = `
		<div id="age-content" class="age-verify-modal">
			<div id="page-initial">
				<h2>Age Verification</h2>
				<p>This website contains restricted content.</p>
				<p>Please verify your age by choosing an option below.</p>
				<button id="start-camera">Use Camera</button>
				<button id="start-upload">Upload ID</button>
			</div>

			<div id="page-camera" style="display:none;">
				<h3>Take a Photo</h3>
				<video id="video-preview" autoplay playsinline style="width:100%;border-radius:8px;"></video>
				<p id="face-nonvisible-text">Please make sure your face is visible.</p>
				<button id="capture-btn" disabled>Capture</button>
			</div>

			<div id="page-upload" style="display:none;">
				<h3>Upload ID Image</h3>
				<div id="drop-zone" class="drop-zone">
					<p>Drag & Drop your ID here or click to select a file</p>
					<input type="file" id="file-input" accept="image/*" />
				</div>
			</div>

			<div id="page-loading" style="display:none;">
				<p>Processing...</p>
				<div class="loader"></div>
			</div>

			<div id="page-success" style="display:none;">
				<h3>Verification Successful</h3>
				<p>Thank you! You may now continue.</p>
			</div>

			<canvas id="capture-canvas" style="display:none;"></canvas>
		</div>

		<style>
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}

			.age-verify-modal {
				background: #fff;
				padding: 20px;
				border-radius: 8px;
				text-align: center;
				max-width: 400px;
				width: 90%;
				font-family: sans-serif;
			}

			.age-verify-modal button {
				background-color: #c2c2c2;
				border: none;
				cursor: pointer;
				border-radius: 5px;
				margin-top: 10px;
				width: 100%;
				padding: 15px;
				font-size: 16px;
			}

			.age-verify-modal button:hover {
				filter: brightness(85%);
			}

			.loader {
				margin: 20px auto;
				border: 6px solid #f3f3f3;
				border-top: 6px solid #3498db;
				border-radius: 50%;
				width: 40px;
				height: 40px;
				animation: spin 1s linear infinite;
			}

			.drop-zone {
				border: 2px dashed #aaa;
				border-radius: 10px;
				padding: 20px;
				position: relative;
				cursor: pointer;
				transition: border-color 0.3s ease;
				margin-top: 10px;
			}

			.drop-zone:hover {
				border-color: #777;
			}

			.drop-zone.dragover {
				border-color: #3498db;
				background: #f0f8ff;
			}

			.drop-zone input[type="file"] {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				opacity: 0;
				cursor: pointer;
			}

			@media (max-width: 480px) {
			.age-verify-modal {
				padding: 15px;
				width: 95%;
			}
			.age-verify-modal button {
				font-size: 15px;
			}
			}
		</style>
		`;
		document.body.appendChild(modal);
		return modal;
	}

	function switchPage(modal, pageId) {
		modal.querySelectorAll('#age-content > div').forEach(div => div.style.display = 'none');
		modal.querySelector(`#${pageId}`).style.display = 'block';
	}

	function simulateProcessing(modal) {
		switchPage(modal, 'page-loading');
		setTimeout(() => {
			switchPage(modal, 'page-success');
			setCookie(COOKIE_NAME, 'true', COOKIE_MAX_AGE);
			setTimeout(() => modal.remove(), 2000);
		}, 3000);
	}

	async function startCameraWithDetection(video, captureBtn, text, modal) {
		const stream = await navigator.mediaDevices.getUserMedia({ video: true });
		video.srcObject = stream;
        if (USE_FACE_DETECTION) {
            video.addEventListener('play', () => {
                const interval = setInterval(async () => {
                    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
                    text.style.display = detections.length <= 0 ? "block" : "none";
                    captureBtn.disabled = detections.length <= 0;
                }, 200);
                video.onpause = video.onended = () => clearInterval(interval);
            });
        } else {
            text.style.display = "block";
            captureBtn.disabled = false;
        }
	}

	async function init() {
		await initFaceApi();
		if (getCookie(COOKIE_NAME)) return;

		const modal = createModal();
		const video = modal.querySelector('#video-preview');
		const captureBtn = modal.querySelector('#capture-btn');
		const fileInput = modal.querySelector('#file-input');
		const dropZone = modal.querySelector('#drop-zone');
		const faceNonVisible = modal.querySelector("#face-nonvisible-text")

		modal.querySelector('#start-camera').addEventListener('click', () => {
			switchPage(modal, 'page-camera');
			startCameraWithDetection(video, captureBtn, faceNonVisible, modal)
				.catch(() => alert('Camera access denied or not available.'));
		});

		captureBtn.addEventListener('click', () => {
			const canvas = modal.querySelector('#capture-canvas');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0);
			video.srcObject.getTracks().forEach(t => t.stop());
			simulateProcessing(modal);
		});

		function handleFile(file) {
			if (file && file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onload = () => simulateProcessing(modal);
				reader.readAsDataURL(file);
			} else {
				alert('Please upload a valid image file.');
			}
		}

		fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

		['dragenter', 'dragover'].forEach(evt =>
			dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); })
		);
		['dragleave', 'drop'].forEach(evt =>
			dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover'); })
		);
		dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));

		modal.querySelector('#start-upload').addEventListener('click', () =>
			switchPage(modal, 'page-upload')
		);
	}

	document.addEventListener('DOMContentLoaded', init);
})();