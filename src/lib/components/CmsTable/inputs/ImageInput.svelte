<script lang="ts">
	import { deserialize } from '$app/forms';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import type { ImageSettings } from '$lib/types.js';
	import { Trash2, Upload } from '@lucide/svelte';
	import imageCompression from 'browser-image-compression';

	interface WebflowImage {
		fileId?: string;
		url: string;
		alt?: string;
	}

	interface Props {
		value: WebflowImage | null;
		itemId: string;
		itemName?: string;
		imageSettings?: ImageSettings;
		onTempFile?: (itemId: string, filename: string) => void;
		disabled?: boolean;
	}

	let {
		value = $bindable(),
		itemId,
		itemName = '',
		imageSettings,
		onTempFile,
		disabled
	}: Props = $props();

	// Default to 600x600 if no settings provided
	let targetWidth = $derived(imageSettings?.width ?? 600);
	let targetHeight = $derived(imageSettings?.height ?? 600);

	let isUploading = $state(false);
	let deleteDialogOpen = $state(false);

	async function handleUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		isUploading = true;

		try {
			// Process image client-side: resize and convert to webp
			const maxDimension = Math.max(targetWidth, targetHeight);
			const options = {
				maxSizeMB: 1,
				maxWidthOrHeight: maxDimension,
				useWebWorker: true,
				fileType: 'image/webp'
			};

			const compressedFile = await imageCompression(file, options);

			// Create a canvas to resize/crop to target dimensions
			const img = await createImageBitmap(compressedFile);
			const canvas = document.createElement('canvas');
			canvas.width = targetWidth;
			canvas.height = targetHeight;

			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Failed to get canvas context');

			// Calculate crop dimensions to maintain aspect ratio
			const targetRatio = targetWidth / targetHeight;
			const imgRatio = img.width / img.height;

			let cropWidth = img.width;
			let cropHeight = img.height;
			let cropX = 0;
			let cropY = 0;

			if (imgRatio > targetRatio) {
				// Image is wider, crop horizontally
				cropWidth = img.height * targetRatio;
				cropX = (img.width - cropWidth) / 2;
			} else {
				// Image is taller, crop vertically
				cropHeight = img.width / targetRatio;
				cropY = (img.height - cropHeight) / 2;
			}

			ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

			// Convert canvas to blob
			const processedBlob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(blob) => {
						if (blob) resolve(blob);
						else reject(new Error('Failed to create blob'));
					},
					'image/webp',
					0.85
				);
			});

			// Upload processed image
			const formData = new FormData();
			formData.append('photo', processedBlob);
			formData.append('memberName', itemName);

			const response = await fetch('?/uploadPhoto', {
				method: 'POST',
				body: formData
			});

			const result = deserialize(await response.text()) as {
				type: 'success' | 'failure' | 'redirect' | 'error';
				data?: {
					success?: boolean;
					image?: {
						url: string;
						alt: string;
						filename: string;
					};
					error?: string;
				};
			};

			if (result.type === 'success' && result.data?.image) {
				const imageData = result.data.image;

				// Update value with new photo URL
				value = {
					fileId: '',
					url: imageData.url,
					alt: imageData.alt || itemName
				};

				// Track temp filename for cleanup
				if (imageData.filename && onTempFile) {
					onTempFile(itemId, imageData.filename);
				}
			} else if (result.type === 'failure') {
				const errorMsg = result.data?.error || 'Unknown error';
				console.error('Upload failed:', result);
				alert('Failed to upload photo: ' + errorMsg);
			} else {
				console.error('Unexpected result type:', result);
				alert('Unexpected response type: ' + result.type);
			}
		} catch (err) {
			console.error('Image processing error:', err);
			alert('Failed to upload photo: ' + (err instanceof Error ? err.message : 'Unknown error'));
		} finally {
			isUploading = false;
			// Reset input so same file can be selected again
			input.value = '';
		}
	}

	function confirmDelete() {
		value = null;
		deleteDialogOpen = false;
	}
</script>

<div class="flex items-center gap-2">
	{#if value?.url}
		<img src={value.url} alt={value.alt || itemName} class="h-10 w-10 rounded-full object-cover" />
		<AlertDialog.Root bind:open={deleteDialogOpen}>
			<AlertDialog.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						type="button"
						variant="ghost"
						size="sm"
						class="text-destructive hover:text-destructive"
						title="Remove photo"
						{disabled}
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				{/snippet}
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Remove Photo</AlertDialog.Title>
					<AlertDialog.Description>
						Are you sure you want to remove this photo? This change will be applied when you save.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<AlertDialog.Action
						class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onclick={confirmDelete}
					>
						Remove Photo
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	{:else}
		<label class="cursor-pointer inline-block">
			<input
				type="file"
				accept="image/*"
				class="hidden"
				onchange={handleUpload}
				disabled={isUploading || disabled}
			/>
			<span
				class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 {isUploading || disabled
					? 'opacity-50 pointer-events-none'
					: ''}"
			>
				<Upload class="h-4 w-4" />
				{isUploading ? 'Uploading...' : 'Upload'}
			</span>
		</label>
	{/if}
</div>
