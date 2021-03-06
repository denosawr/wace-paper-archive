import { browser } from '$app/env';

let predictLength, downloadZip, streamSaver;

export const BASE_URL = 'https://papers.olliecheng.me/dl';

export interface FileObject {
	path: string;
	url: string;
	size: number;
}

export async function download(files, callback, progressCallback) {
	let clientZip = await import('client-zip');
	predictLength = clientZip.predictLength;
	downloadZip = clientZip.downloadZip;

	streamSaver = await import('streamsaver');
	console.log(streamSaver);

	let metadata = files.map((x) => {
		return {
			name: x.path,
			size: x.size
		};
	});

	// const zipSize = calculateZipSize(files);
	const zipSize = predictLength(metadata);

	interface InputType {
		name: string;
		input: Response;
	}

	let fileResponses: InputType[] = [];

	async function* lazyFetch(): AsyncGenerator<InputType, void, void> {
		for (let file of files)
			yield {
				name: file.path,
				input: await fetch(file.url)
			};
	}

	const fileZipped = downloadZip(lazyFetch());

	fileStream = streamSaver.createWriteStream('WACE.zip', {
		size: zipSize // (optional filesize) Will show progress
	});

	let bytes = 0n;
	let downloadPercentage = 0n;

	const ByteCountStreamTransformer = new TransformStream({
		start() {},
		transform(chunk, controller) {
			bytes += BigInt(chunk.length);

			// will be rounded, as BigInt operations have integer precision
			let currentDownloadPercentage = (bytes * 100n) / zipSize;
			if (currentDownloadPercentage - downloadPercentage >= 2) {
				downloadPercentage = currentDownloadPercentage;
				progressCallback(Number(downloadPercentage));
			}

			controller.enqueue(chunk);
		},
		flush() {}
	});

	let downloading = true;
	fileZipped
		.body!.pipeThrough(ByteCountStreamTransformer)
		.pipeTo(fileStream)
		.then(
			() => {
				downloading = false;
				callback();
			},
			() => {
				downloading = false;
				console.log('Failed download...');
				callback();
			}
		);

	return;
}

if (browser) {
	// abort so it does not look stuck
	window.onunload = () => {
		if (fileStream) {
			fileStream.abort();
		}
	};

	window.onbeforeunload = (evt) => {
		if (!downloadComplete) {
			return 'Are you sure you want to leave? Closing this site will stop the download.';
		}
	};
}

function crawlDirTree(paths: string[], dirs): FileObject[] {
	let basePath = paths.join('/');

	return Object.entries(dirs)
		.filter(([path, _]) => {
			return path.startsWith(basePath);
		})
		.map(([path, size]) => {
			return {
				path: path,
				url: encodeURI(`${BASE_URL}/${path}`),
				size: size as number
			};
		});
}

let dirs;
let downloadComplete = true;
let fileStream;

export async function fetchDirectoryTree() {
	let rootReq = await fetch(`${BASE_URL}/root.json`);
	let rootText = await rootReq.text();

	console.log('Loaded file directory');
	let rootObj = JSON.parse(rootText);

	delete rootObj['root.json'];

	dirs = rootObj;
	return rootObj;
}

export function placeholderDirectoryTree() {
	return [
		'accounting_and_finance',
		'ancient_history',
		'animal_production_systems',
		'applied_information_technology',
		'aviation',
		'biology',
		'business_management_and_enterprise',
		'career_and_enterprise',
		'chemistry',
		'children_family_and_the_community',
		'chinese_first_language',
		'chinese_second_language',
		'computer_science',
		'dance',
		'design',
		'drama',
		'earth_and_environmental_science',
		'economics',
		'engineering_studies',
		'english',
		'english_as_an_additional_languagedialect',
		'food_science_and_technology',
		'french',
		'french_second_language',
		'geography',
		'german',
		'german_background_language',
		'health_studies',
		'human_biology',
		'indonesian_second_language',
		'integrated_science',
		'italian',
		'italian_second_language',
		'japanese_second_language',
		'literature',
		'marine_and_maritime_studies_formerly_technology',
		'materials_design_and_technology',
		'mathematics_applications',
		'mathematics_methods',
		'mathematics_specialist',
		'media_production_and_analysis',
		'modern_history',
		'music',
		'outdoor_education',
		'philosophy_and_ethics',
		'physical_education_studies',
		'physics',
		'plant_production_systems',
		'politics_and_law',
		'psychology',
		'religion_and_life',
		'visual_arts'
	];
}
