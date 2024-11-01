import cv2
import face_recognition
import numpy as np
import os


class ModernFaceRecognition:
    def __init__(self, known_faces_dir="known_faces"):
        """
        Initialize face recognition system.

        Args:
            known_faces_dir: Directory containing face images for recognition
        """
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_faces_dir = known_faces_dir

        # Modern UI Configuration
        self.font = cv2.FONT_HERSHEY_SIMPLEX
        self.modern_colors = {
            "box_bg": (50, 50, 50),  # Dark gray background
            "box_text": (255, 255, 255),  # White text
            "face_border": (100, 200, 100),  # Soft green border
        }

    def load_known_faces(self):
        """
        Load and encode known faces from directory
        """
        for person_name in os.listdir(self.known_faces_dir):
            person_path = os.path.join(self.known_faces_dir, person_name)

            # Skip if not a directory
            if not os.path.isdir(person_path):
                continue

            # Collect encodings for this person
            person_encodings = []
            for image_name in os.listdir(person_path):
                image_path = os.path.join(person_path, image_name)

                # Load image
                image = face_recognition.load_image_file(image_path)
                face_encodings = face_recognition.face_encodings(image)

                if face_encodings:
                    person_encodings.append(face_encodings[0])

            # If we found encodings, add average encoding
            if person_encodings:
                avg_encoding = np.mean(person_encodings, axis=0)
                self.known_face_encodings.append(avg_encoding)
                self.known_face_names.append(person_name)
                print(f"Loaded faces for {person_name}")

    def start_recognition(self):
        """
        Start real-time face recognition with modern UI
        """
        # Open webcam
        video_capture = cv2.VideoCapture(0)

        while True:
            # Capture frame-by-frame
            ret, frame = video_capture.read()

            # Resize frame for faster processing
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            # Find faces in the frame
            face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(
                rgb_small_frame, face_locations
            )

            # Process each face
            for (top, right, bottom, left), face_encoding in zip(
                face_locations, face_encodings
            ):
                # Scale back to original frame size
                top, right, bottom, left = top * 4, right * 4, bottom * 4, left * 4

                # Compare face with known faces
                matches = face_recognition.compare_faces(
                    self.known_face_encodings, face_encoding, tolerance=0.6
                )
                name = "Unknown"

                # Find best match
                if True in matches:
                    best_match_index = np.argmin(
                        face_recognition.face_distance(
                            self.known_face_encodings, face_encoding
                        )
                    )
                    name = self.known_face_names[best_match_index]

                # Modern UI: Draw stylish face recognition box
                # Soft border
                cv2.rectangle(
                    frame,
                    (left, top),
                    (right, bottom),
                    self.modern_colors["face_border"],
                    2,
                )

                # Name background
                cv2.rectangle(
                    frame,
                    (left, bottom + 10),
                    (right, bottom + 50),
                    self.modern_colors["box_bg"],
                    cv2.FILLED,
                )

                # Name text with modern styling
                cv2.putText(
                    frame,
                    name,
                    (left + 10, bottom + 40),
                    self.font,
                    0.9,
                    self.modern_colors["box_text"],
                    2,
                )

            # Display the resulting frame
            cv2.imshow("Modern Face Recognition", frame)

            # Break loop on 'q' press
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        # Release resources
        video_capture.release()
        cv2.destroyAllWindows()
