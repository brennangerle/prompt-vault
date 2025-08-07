import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { Prompt } from './types';

// Collection reference
const promptsCollection = collection(db, 'prompts');

// Create a new prompt
export async function createPrompt(
  userId: string,
  teamId: string | undefined,
  promptData: Omit<Prompt, 'id'>
): Promise<string> {
  try {
    const data: any = {
      ...promptData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (promptData.sharing === 'team') {
      data.teamId = teamId;
    }
    const docRef = await addDoc(promptsCollection, data);
    return docRef.id;
  } catch (error) {
    console.error('Error creating prompt:', error);
    throw error;
  }
}

// Update an existing prompt
export async function updatePrompt(
  promptId: string,
  updates: Partial<Prompt>
): Promise<void> {
  try {
    const promptRef = doc(promptsCollection, promptId);
    await updateDoc(promptRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    throw error;
  }
}

// Delete a prompt
export async function deletePrompt(promptId: string): Promise<void> {
  try {
    const promptRef = doc(promptsCollection, promptId);
    await deleteDoc(promptRef);
  } catch (error) {
    console.error('Error deleting prompt:', error);
    throw error;
  }
}

// Get prompts based on sharing scope
export async function getPrompts(
  userId: string,
  teamId: string | undefined,
  scope: 'private' | 'team' | 'global'
): Promise<Prompt[]> {
  try {
    let constraints: QueryConstraint[] = [];

    if (scope === 'private') {
      // Get all prompts created by the user
      constraints = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      ];
    } else if (scope === 'team') {
      // Get prompts shared with team
      constraints = [
        where('sharing', '==', 'team'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      ];
    } else if (scope === 'global') {
      // Get prompts shared globally
      constraints = [
        where('sharing', '==', 'global'),
        orderBy('createdAt', 'desc')
      ];
    }

    const q = query(promptsCollection, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const prompts: Prompt[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      prompts.push({
        id: doc.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        software: data.software,
        sharing: data.sharing,
      });
    });

    return prompts;
  } catch (error) {
    console.error('Error fetching prompts:', error);
    throw error;
  }
}

// Subscribe to prompts in real-time
export function subscribeToPrompts(
  userId: string,
  teamId: string | undefined,
  scope: 'private' | 'team' | 'global',
  callback: (prompts: Prompt[]) => void
): () => void {
  let constraints: QueryConstraint[] = [];

  if (scope === 'private') {
    constraints = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ];
  } else if (scope === 'team') {
    constraints = [
      where('sharing', '==', 'team'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    ];
  } else if (scope === 'global') {
    constraints = [
      where('sharing', '==', 'global'),
      orderBy('createdAt', 'desc')
    ];
  }

  const q = query(promptsCollection, ...constraints);
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const prompts: Prompt[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      prompts.push({
        id: doc.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        software: data.software,
        sharing: data.sharing,
      });
    });
    callback(prompts);
  }, (error) => {
    console.error('Error in prompt subscription:', error);
  });

  return unsubscribe;
}

// Get a single prompt by ID
export async function getPrompt(promptId: string): Promise<Prompt | null> {
  try {
    const promptRef = doc(promptsCollection, promptId);
    const promptDoc = await getDoc(promptRef);
    
    if (promptDoc.exists()) {
      const data = promptDoc.data();
      return {
        id: promptDoc.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        software: data.software,
        sharing: data.sharing,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching prompt:', error);
    throw error;
  }
}

// Update prompt sharing status
export async function updatePromptSharing(
  promptId: string,
  sharing: 'private' | 'team' | 'global'
): Promise<void> {
  try {
    const promptRef = doc(promptsCollection, promptId);
    await updateDoc(promptRef, {
      sharing,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating prompt sharing:', error);
    throw error;
  }
}