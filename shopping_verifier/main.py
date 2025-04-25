import cv2
import requests
import time
import os
import base64

# --- Configuration ---
# Replace with your actual API key and endpoint if using a specific service
MULTIMODAL_API_KEY = os.environ.get("YOUR_MULTIMODAL_API_KEY", "YOUR_API_KEY_HERE")
MULTIMODAL_API_ENDPOINT = "YOUR_API_ENDPOINT_HERE" # Example: "https://api.openai.com/v1/chat/completions" for GPT-4V

CAPTURE_DURATION_SECONDS = 10 # How long to capture video
FRAME_INTERVAL_SECONDS = 2    # Analyze a frame every X seconds
WEBCAM_INDEX = 0              # Default webcam

# --- Helper Functions ---

def encode_image_to_base64(frame):
    """Encodes a cv2 frame (numpy array) to a base64 string."""
    success, buffer = cv2.imencode('.jpg', frame)
    if not success:
        print("Error encoding frame.")
        return None
    return base64.b64encode(buffer).decode('utf-8')

def call_multimodal_model(base64_image):
    """
    Sends the image to the multimodal model API and returns the detected items.
    Placeholder: Needs implementation based on the chosen model's API.
    """
    print(f"Sending frame to model (size: {len(base64_image)} bytes)...")
    # --- Replace with actual API call logic ---
    # Example structure for GPT-4 Vision (adapt as needed):
    # headers = {
    #     "Content-Type": "application/json",
    #     "Authorization": f"Bearer {MULTIMODAL_API_KEY}"
    # }
    # payload = {
    #     "model": "gpt-4-vision-preview", # Or your chosen model
    #     "messages": [
    #         {
    #             "role": "user",
    #             "content": [
    #                 {"type": "text", "text": "Identify the items the person is picking up or interacting with. List only the item names."},
    #                 {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
    #             ]
    #         }
    #     ],
    #     "max_tokens": 300
    # }
    # try:
    #     response = requests.post(MULTIMODAL_API_ENDPOINT, headers=headers, json=payload)
    #     response.raise_for_status() # Raise an exception for bad status codes
    #     result = response.json()
    #     # --- Process the result to extract item names ---
    #     # This depends heavily on the API's response format
    #     # Example: content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
    #     # detected_items = [item.strip() for item in content.split('\n') if item.strip()]
    #     # return detected_items
    # except requests.exceptions.RequestException as e:
    #     print(f"API Error: {e}")
    #     return []
    # -------------------------------------------

    # Placeholder return
    print("Placeholder: Model analysis not implemented.")
    time.sleep(1) # Simulate API call delay
    # Simulate finding items based on image size (replace with real logic)
    if len(base64_image) % 2 == 0:
         return ["apple", "banana"]
    else:
         return ["orange"]
    # return [] # Return empty list if no items detected or error

def get_bill_items():
    """Gets the list of items from the bill. Placeholder."""
    print("\n--- Bill Items ---")
    # Placeholder: Replace with reading from file or user input
    bill_input = input("Enter bill items separated by commas (e.g., apple,banana,milk): ")
    return [item.strip().lower() for item in bill_input.split(',') if item.strip()]

def compare_items(detected_items_set, bill_items_list):
    """Compares detected items with bill items."""
    print("\n--- Comparison ---")
    bill_set = set(bill_items_list)
    detected_set = set(item.lower() for item in detected_items_set) # Ensure lowercase comparison

    matched_items = detected_set.intersection(bill_set)
    missed_on_bill = detected_set.difference(bill_set) # Items detected but not on bill
    missed_by_detection = bill_set.difference(detected_set) # Items on bill but not detected

    print(f"Detected Items: {sorted(list(detected_set))}")
    print(f"Bill Items:     {sorted(list(bill_set))}")

    if not missed_on_bill and not missed_by_detection:
        print("\nResult: Bill matches detected items!")
        return True
    else:
        print("\nResult: Discrepancy found!")
        if missed_on_bill:
            print(f"  - Items detected but NOT on bill: {sorted(list(missed_on_bill))}")
        if missed_by_detection:
            print(f"  - Items on bill but NOT detected: {sorted(list(missed_by_detection))}")
        return False

# --- Main Execution ---

def main():
    """Main function to run the shopping verifier."""
    print("Starting Shopping Verifier...")

    # Initialize webcam
    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print(f"Error: Could not open webcam index {WEBCAM_INDEX}.")
        return

    print(f"Capturing video for {CAPTURE_DURATION_SECONDS} seconds...")
    start_time = time.time()
    last_frame_time = 0
    all_detected_items = set()

    try:
        while time.time() - start_time < CAPTURE_DURATION_SECONDS:
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to capture frame.")
                break

            # Display the frame (optional) - Removed for headless mode
            # cv2.imshow('Webcam Feed', frame)

            # Process frame at specified intervals
            current_time = time.time()
            if current_time - last_frame_time >= FRAME_INTERVAL_SECONDS:
                print(f"\nAnalyzing frame at {int(current_time - start_time)}s...")
                base64_image = encode_image_to_base64(frame)
                if base64_image:
                    detected = call_multimodal_model(base64_image)
                    if detected:
                        print(f"Detected: {detected}")
                        all_detected_items.update(detected) # Add to set (avoids duplicates)
                last_frame_time = current_time

            # Allow breaking the loop by pressing 'q' - Removed for headless mode (no window)
            # if cv2.waitKey(1) & 0xFF == ord('q'):
            #     print("Capture interrupted by user.")
            #     break

            # Add a small delay to prevent tight loop without waitKey
            time.sleep(0.01)

    finally:
        # Release webcam and close windows
        cap.release()
        # cv2.destroyAllWindows() # Removed for headless mode
        print("\nVideo capture finished.")

    # Get bill items
    bill_items = get_bill_items()

    # Compare detected items with bill
    compare_items(all_detected_items, bill_items)

    print("\nShopping Verifier finished.")


if __name__ == "__main__":
    # Check for API key (optional but good practice)
    if MULTIMODAL_API_KEY == "YOUR_API_KEY_HERE":
        print("Warning: Multimodal API key not set. Using placeholder logic.")
        print("Set the YOUR_MULTIMODAL_API_KEY environment variable or replace in script.")

    main()
