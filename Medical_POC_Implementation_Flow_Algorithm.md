# Medical Domain Photo Avatar Video POC
## Implementation Flow & Algorithm Document

### 1. Purpose

This document translates the Medical Domain Photo Avatar Video POC overview into an implementation-level execution flow.

It explains how data should move through the system from the moment a user submits medical content until the final patient-friendly video is generated and made available to the user.

This document intentionally does not describe source code, classes, functions, or implementation syntax. It defines the processing algorithm, data movement, persistence points, state transitions, and responsibilities of each layer.

---

## 2. Storage Architecture

The POC will use **Amazon S3 as the cloud object storage layer** for files and generated media.

S3 will be used to store the actual binary objects, while the application database will store the metadata and references required to locate those objects.

### Objects Stored in S3

The following types of files should be stored in S3:

- Uploaded medical documents
- Uploaded custom avatar/photo images
- Generated audio files
- Generated videos
- Any other intermediate or final media files that need persistent storage

### Database Responsibility

The database should not be used as the primary storage location for these binary files.

Instead, the database should store the S3 object reference/URL along with the metadata required to associate the object with the correct user and generation request.

Conceptually:

**User → Generation Request → DB Metadata → S3 Object Reference → Actual File**

For example:

```text
Generation Request
    ↓
Database
    ├── user_id
    ├── generation_id
    ├── input_document_s3_reference
    ├── avatar_s3_reference
    ├── audio_s3_reference
    └── video_s3_reference
             ↓
            S3
    ├── medical documents
    ├── images
    ├── audio
    └── videos
```

### Storage Algorithm

Whenever the system receives or generates a file:

1. Identify the current user and generation request.
2. Determine the type of object being stored.
3. Upload the file to the appropriate S3 location.
4. Receive/construct the S3 object reference.
5. Store that reference in the database against the current user and generation request.
6. Continue processing using the stored reference rather than treating the database as the file-storage layer.

This approach keeps the database focused on application metadata while S3 handles the actual file and media storage.

---

## 3. End-to-End Processing Flow

The complete execution flow is:

**User Input → Request Creation → Input Persistence → Medical Text Processing → Script Generation → Script Persistence → Voice Generation → Audio Persistence → Avatar/Photo Processing → Video Generation → Video Persistence → Final Result**

Every stage operates in the context of the same user and generation request.

A generation/request identifier should be maintained throughout the complete pipeline so that all generated artifacts can be associated with the correct user request.

---

# 4. Step 1 — Receive User Input

## Objective

Receive the medical content provided by the user and create a trackable generation request.

## Input

The user can provide:

- A medical document
- A medical paragraph or text

## Algorithm

1. Receive the request from the frontend.
2. Identify the authenticated user.
3. Determine whether the input is a document or direct text.
4. Create a new generation request for the user.
5. Assign a unique generation/request identifier.
6. Set the initial request status.
7. Store the original input or the reference to the uploaded file against the user and generation request.
8. Record the selected avatar/photo, voice, and provider configuration if they were supplied at request creation time.
9. Pass the request to the input-processing stage.

## Data Persisted

At minimum, the request should be associated with:

- User
- Generation/request ID
- Input type
- Original medical content or uploaded-file reference
- Selected avatar/photo reference
- Selected voice
- Selected providers
- Request status
- Creation timestamp

## Output

A registered generation request with all initial user selections available for subsequent stages.

---

# 5. Step 2 — Document Ingestion, Extraction and Normalization

## Objective

Convert a user-uploaded medical document into reliable, usable medical text before sending it to the LLM.

This stage applies when the user provides a document. If the user provides text directly, the system can move directly to the normalization/validation stage.

## Input

The generation request and its associated medical input.

## Algorithm

1. Retrieve the input associated with the generation request.
2. Determine whether the input is direct text or an uploaded document.
3. If the user provided direct text:
   - Use the submitted text as the source content.
   - Continue to text validation and normalization.
4. If the user uploaded a document:
   - Identify the document type.
   - Store the original document in S3.
   - Store the S3 object reference against the user and generation request in the database.
5. Determine the appropriate extraction approach based on the document type.
6. For a text-based document, extract the available text from the document.
7. If the document is a scanned/image-based document and normal text extraction is not sufficient, process the document through OCR.
8. Produce the extracted raw text.
9. Validate that usable text was successfully extracted.
10. Normalize the extracted/submitted content.
11. Preserve meaningful document structure such as headings, paragraphs, sections, and other relevant textual relationships where possible.
12. Remove extraction noise and normalize formatting where required.
13. Store the extracted/normalized content against the same generation request.
14. Update the request status.
15. Pass the normalized medical content to the medical text simplification stage.

## Document Processing Flow

```text
User Uploads Medical Document
             ↓
        Store Original
             ↓
             S3
             ↓
       Identify File Type
             ↓
       ┌─────┴─────┐
       ↓           ↓
 Text-based     Scanned /
  Document      Image-based
       ↓           ↓
 Text          OCR Processing
Extraction         ↓
       └─────┬─────┘
             ↓
      Extracted Raw Text
             ↓
     Validation & Cleanup
             ↓
       Normalized Text
             ↓
      Store Text Reference
             ↓
     Medical Simplification
```

## Data Persisted

For a document-based request, the system should retain:

- Original document S3 reference
- Input/document type
- Extracted text
- Normalized medical content
- User ID
- Generation/request ID
- Processing status
- Relevant timestamps

The actual uploaded document remains in S3. The database stores its reference and the metadata required to associate it with the generation request.

## Why Store the Extracted/Normalized Content?

The extracted content should be retained so later stages do not need to repeatedly process the original document.

For example, if the user later wants to regenerate the video using a different voice, the system can continue from the stored normalized content rather than uploading and extracting the document again.

The same stored content can also be used if the video needs to be regenerated using a different TTS or video provider.

## Large Document Handling

The POC should define a supported document/input size limit.

If a document exceeds the supported processing size, the system should not blindly send the complete content to the LLM. The document can be divided into logical sections/chunks and processed according to the defined document-processing strategy.

The exact chunking strategy can be finalized during implementation based on the expected document size and LLM context requirements.

## Output

Validated and normalized medical content ready for LLM processing.

---

# 6. Step 3 — Medical Text Simplification

## Objective

Convert medical terminology into language that is easier for a patient to understand while preserving the meaning of the original content.

## Input

Normalized medical content.

## Algorithm

1. Retrieve the normalized medical content for the current generation request.
2. Identify the LLM provider and model selected for the request.
3. Send the medical content to the selected LLM.
4. Instruct the LLM to simplify medical terminology and produce patient-friendly language.
5. Generate the simplified explanation and video-oriented script.
6. Receive the LLM response.
7. Validate that the response contains usable output.
8. Associate the generated result with the current generation request.
9. Store the simplified explanation and script.
10. Record the LLM/provider information used for the generation.
11. Update the request status.
12. Pass the generated script to the voice-generation stage.

## Data Persisted

- Simplified explanation
- Video script
- LLM provider
- Model used
- Generation request ID
- Processing status
- Relevant timestamps

## Output

A validated patient-friendly explanation and video script.

---

# 7. Step 4 — Script Validation

## Objective

Ensure that the generated script is usable for voice and video generation.

## Algorithm

1. Retrieve the generated script.
2. Verify that the script is not empty or incomplete.
3. Verify that the content is suitable for narration.
4. Confirm that the script belongs to the current generation request.
5. If validation succeeds, continue to voice generation.
6. If validation fails, mark the relevant processing stage as failed and retain the failure information against the request.

## Output

A validated narration script.

---

# 8. Step 5 — Voice Selection and TTS Processing

## Objective

Convert the patient-friendly script into natural speech using the voice selected by the user.

## Input

Validated video script and selected voice configuration.

## Algorithm

1. Retrieve the script associated with the generation request.
2. Retrieve the selected voice.
3. Identify the selected TTS provider.
4. Send the script and required voice configuration to the selected TTS provider.
5. Generate the audio narration.
6. Receive the generated audio or provider-generated audio reference.
7. Validate that usable audio was generated.
8. Store the audio reference against the same generation request.
9. Store the TTS provider, voice, and relevant generation information.
10. Update the request status.
11. Pass the generated audio reference to the avatar/video stage.

## Data Persisted

- Audio reference
- TTS provider
- Voice identifier/configuration
- Generation request ID
- Processing status
- Timestamps

## Output

Generated narration audio associated with the generation request.

---

# 9. Step 6 — Avatar or Custom Photo Processing

## Objective

Determine which visual identity will be used for the talking-head video and ensure it is ready for video generation.

## Input

User's avatar/photo selection and generation request.

## Algorithm

1. Retrieve the avatar/photo selection for the current generation request.
2. Determine whether the user selected a pre-made avatar or uploaded a custom photo.
3. If a pre-made avatar was selected, validate that the selected avatar is available.
4. If a custom photo was uploaded:
   - Retrieve the uploaded photo.
   - Validate that the photo can be used by the selected video provider.
   - Store or retain its reference against the generation request.
5. Confirm that a valid avatar/photo is available.
6. Update the request with the final avatar/photo reference.
7. Pass the selected visual input to the video-generation stage.

## Output

A validated avatar or custom photo ready for video generation.

---

# 10. Step 7 — Video Generation Request

## Objective

Combine the generated narration with the selected avatar/photo to create the talking-head video.

## Input

- Generation request
- Generated audio
- Avatar/photo
- Video provider configuration
- Script/metadata where required by the selected provider

## Algorithm

1. Retrieve the audio generated for the current request.
2. Retrieve the validated avatar/photo.
3. Identify the selected video-generation provider.
4. Prepare the provider request using the required input combination.
5. Send the video-generation request to the provider.
6. Receive the provider's generation response.
7. If the provider creates a background/asynchronous job, store the provider job reference against the generation request.
8. Update the generation request to indicate that video generation is in progress.
9. Continue to the video-result tracking stage.

---

# 11. Step 8 — Track Video Generation

## Objective

Track the video provider's asynchronous processing until a final video is available.

## Algorithm

1. Retrieve the provider job/reference associated with the generation request.
2. Check the provider for the current generation status.
3. If the video is still processing, keep the generation request in the processing state.
4. Continue checking according to the provider's supported mechanism.
5. If the provider reports success, retrieve the final video reference.
6. If the provider reports failure, capture the failure information against the generation request.
7. If successful, pass the final video reference to the persistence stage.

## Output

Either:

- A completed video reference, or
- A tracked generation failure.

---

# 12. Step 9 — Store Final Video Result

## Objective

Persist the final generated result so it can be retrieved later by the user.

## Algorithm

1. Receive the final video reference.
2. Associate the video with the current generation request.
3. Store the video URL/reference.
4. Store the final generation status.
5. Retain references to the script, audio, avatar/photo, and providers used.
6. Record completion time.
7. Mark the generation request as completed.
8. Make the completed result available to the API layer.

## Data Persisted

The completed request should retain references to:

- User
- Generation/request ID
- Original medical input
- Normalized medical content
- Simplified explanation
- Video script
- Voice
- Audio
- Avatar/photo
- Video provider
- Video URL/reference
- Final status
- Timestamps

---

# 13. Step 10 — Return Result to User

## Objective

Return the completed patient-friendly video and its associated information to the frontend.

## Algorithm

1. Receive the completed generation request from the processing layer.
2. Retrieve the final stored result.
3. Confirm that the result belongs to the requesting user.
4. Return the generated video reference and relevant metadata.
5. The frontend presents the generated video to the user.

## Final Output

The user receives:

- Condition name where available
- Simplified explanation
- Video script
- Generated video URL/reference
- S3 reference for the generated video
- Avatar used
- Voice used
- Generation status

---

# 14. Overall Data Lifecycle

The same generation request should carry the complete lifecycle of the user's content.

**Stage 1**

User Input

↓

**Stage 2**

Original Input Stored

↓

**Stage 3**

Normalized Medical Content Stored

↓

**Stage 4**

Simplified Explanation + Script Stored

↓

**Stage 5**

Generated Audio Stored

↓

**Stage 6**

Avatar/Photo Reference Stored

↓

**Stage 7**

Video Generation Job Reference Stored

↓

**Stage 8**

Final Video Reference Stored

↓

**Stage 9**

Generation Marked Completed

↓

**Stage 10**

Result Returned to User

---

# 15. Request State Management

The generation request should maintain a clear processing state so the system knows where the request currently is.

A request may move through states such as:

**RECEIVED → PROCESSING_INPUT → SIMPLIFYING → SCRIPT_READY → GENERATING_AUDIO → AUDIO_READY → PREPARING_AVATAR → GENERATING_VIDEO → VIDEO_READY → COMPLETED**

If any stage fails, the request should retain the failed state and relevant failure information rather than losing the previously generated artifacts.

The exact state names can be finalized during implementation.

---

# 16. Provider Abstraction Flow

The overview requires the LLM, TTS, and video-generation layers to remain provider-agnostic.

Therefore, the execution flow should treat provider selection as configuration rather than as a change to the overall pipeline.

## LLM

**Medical Content → Selected LLM Provider → Patient-Friendly Script**

Possible providers described in the overview include Claude, OpenAI, Gemini, and Grok.

## TTS

**Patient-Friendly Script → Selected TTS Provider → Audio**

Possible providers described in the overview include Deepgram, Sarvam, ElevenLabs, OpenAI, Google Cloud, and Speechmatics.

## Video

**Avatar/Photo + Audio + Required Script/Metadata → Selected Video Provider → Video**

Possible providers described in the overview include HeyGen, D-ID, Vidnoz, Hedra, Inkaai, Replicate, Sync Labs, and fal.ai.

The provider can change without changing the business flow of the POC.

---

# 17. Failure Handling

Each processing stage should be independently trackable.

## General Algorithm

1. Start processing a stage.
2. Persist the stage/request status.
3. Perform the external or internal operation.
4. Validate the result.
5. If successful, persist the output and continue.
6. If unsuccessful, persist the failure information.
7. Keep previously generated outputs associated with the request.
8. Mark the request as failed or retrying according to the applicable stage.
9. Do not restart the complete pipeline unnecessarily when only a later stage needs to be retried.

This allows failures in TTS or video generation, for example, to be handled without unnecessarily repeating medical-text simplification.

---

# 18. User Data Isolation

Every generated artifact must remain associated with the user and generation request that created it.

The system should therefore maintain the relationship:

**User → Generation Request → Generated Artifacts**

Generated artifacts include:

- Original input
- Normalized content
- Simplified explanation
- Script
- Audio
- Avatar/photo reference
- Video
- Provider metadata

When retrieving a result, the system should verify that the requesting user is authorized to access that generation request.

---

# 19. End-to-End Algorithm

The complete algorithm can be summarized as follows:

1. Receive medical content from the user.
2. Identify the user.
3. Create a generation request.
4. Persist the original input and initial selections.
5. If the input is a document, image, or other file, upload it to S3 and store its S3 reference in the database.
6. Extract and normalize medical text.
7. Persist the normalized content.
7. Retrieve the selected LLM configuration.
8. Send the medical content for simplification.
9. Receive the patient-friendly explanation and video script.
10. Validate the generated script.
11. Persist the explanation and script.
12. Retrieve the selected voice and TTS configuration.
13. Send the script to the TTS provider.
14. Receive and validate the generated audio.
15. Persist the audio reference and voice information.
16. Retrieve the selected avatar or custom photo.
17. Validate the avatar/photo.
18. Persist the visual input reference.
19. Retrieve the selected video provider.
20. Submit the avatar/photo and audio, along with required script/metadata.
24. Track the video-generation job if processing is asynchronous.
25. Retrieve the completed video when generation succeeds.
26. Upload the completed video to S3 and store its S3 reference in the database.
27. Persist the final video reference.
24. Mark the generation request as completed.
25. Retrieve the complete result associated with the user and request.
26. Return the generated video and associated metadata to the frontend.

---

# 20. Result

At the end of the pipeline, one generation request represents the complete journey of the medical content:

**Medical Input**
→ **Normalized Content**
→ **Simplified Explanation**
→ **Video Script**
→ **Generated Voice**
→ **Selected Avatar/Photo**
→ **Generated Video**

All stages remain connected through the same user and generation request, allowing the system to track processing, retrieve results, handle failures, and later support analytics.
