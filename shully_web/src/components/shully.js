import React, { useState } from "react";
import { auth, db, storage } from "../firebase";
import { 
    AttachFileInput, ModifyFileButton, ShullyWrapper, 
    ShullyColumn, ShullyPayload, ShullyUsername, 
    Photo, PhotoBack, DeleteButton, ButtonContainer 
} from "./auth-Components";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { deleteObject, ref, getDownloadURL, uploadBytes } from "firebase/storage";

export default function Shully({ username, photo, shully, userid, id }) {
    const user = auth.currentUser;

    const [isEditing, setIsEditing] = useState(false); // 편집 모드 상태
    const [editShully, setEditShully] = useState(shully); // 텍스트 상태
    const [file, setFile] = useState(null); // 새로 업로드된 파일 상태
    const [previewURL, setPreviewURL] = useState(photo); // 파일 미리 보기 URL
    const handleAction = async (actionType) => {
        const ok = window.confirm(
            `Are you sure you want to ${actionType === "delete" ? "delete" : "edit"} this content?`
        );
        if (!ok) return;
    
        if (actionType === "delete") {
            try {
                const deleteTasks = [deleteDoc(doc(db, "shullys", id))];
                if (photo) {
                    const photoRef = ref(storage, `shullys/${user.uid}/${id}`);
                    deleteTasks.push(deleteObject(photoRef));
                }
                await Promise.all(deleteTasks);
                alert("Content deleted successfully.");
            } catch (e) {
                console.error("Error deleting content:", e);
                alert("Failed to delete content. Please try again.");
            }
        } else if (actionType === "modify") {
            setIsEditing(true);
        }
    };
    
    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0] || null;
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewURL(URL.createObjectURL(selectedFile)); // 파일 미리 보기 URL 생성
        } else {
            setFile(null);
            setPreviewURL(photo); // 기존 사진으로 복원
        }
    };

    const updateShully = async (e) => {
        e.preventDefault();
        try {
            const updates = { shully: editShully };
            if(!file) return null;
            if (file) {
                // 기존 사진 삭제
                if (photo) {
                    const existingFileRef = ref(storage, photo);
                    await deleteObject(existingFileRef);
                }

                // 새 사진 업로드
                const newFileRef = ref(storage, `shullys/${user.uid}/${id}`);
                const uploadResult = await uploadBytes(newFileRef, file);
                const photoURL = await getDownloadURL(uploadResult.ref);
                updates.photo = photoURL;
            }

            // Firestore 문서 업데이트
            await updateDoc(doc(db, "shullys", id), updates);

            alert("Content updated successfully.");
            setFile(null); // 파일 상태 초기화
            setPreviewURL(null); // 미리 보기 초기화
            setIsEditing(false);
        } catch (e) {
            console.error("Error updating content:", e);
            alert("Failed to update content. Please try again.");
        }
    };

    return (
        <ShullyWrapper>
            <ShullyColumn>
                <ShullyUsername>{username}</ShullyUsername>
                {isEditing ? (
                    <textarea
                        value={editShully}
                        onChange={(e) => setEditShully(e.target.value)}
                        rows="3"
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "10px",
                            border: "1px solid rgb(191, 169, 88)",
                        }}
                    />
                ) : (
                    <ShullyPayload>{shully}</ShullyPayload>
                )}
            </ShullyColumn>
            <ShullyColumn>
                {/* 미리 보기 이미지 또는 기존 사진 표시 */}
                {previewURL ? (
                    <Photo src={previewURL} alt="Preview" />
                ) : (
                    <PhotoBack />
                )}
            </ShullyColumn>

            <ButtonContainer>
                {user?.uid === userid && (
                    <>
                        {isEditing ? (
                            <>
                                <DeleteButton onClick={updateShully}>Save</DeleteButton>
                                <ModifyFileButton htmlFor="editFile">
                                    {file ? "Photo added ✅" : "Add Photo"}
                                </ModifyFileButton>
                                <AttachFileInput
                                    onChange={handleFileChange}
                                    type="file"
                                    id="editFile"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                />
                            </>
                        ) : (
                            <DeleteButton onClick={() => setIsEditing(true)}>Edit</DeleteButton>
                        )}
                        <DeleteButton onClick={() => handleAction("delete")}>Delete</DeleteButton>
                    </>
                )}
            </ButtonContainer>
        </ShullyWrapper>
    );
}
