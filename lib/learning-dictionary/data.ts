import type { LifeLabAvailability, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  getLifeLabFlashcardDecksData,
  getLifeLabNoteData,
  getLifeLabSectionData,
} from "@/lib/life-lab";
import {
  buildDictionaryEntryModel,
  collectDictionaryBrowseCards,
  DEFAULT_DICTIONARY_BROWSE_FILTERS,
  LEARNING_DICTIONARY_SECTION_ID,
  type DictionaryBrowseFilters,
  type DictionaryCardModel,
  type DictionaryEntryModel,
} from "@/lib/learning-dictionary/model";
import {
  buildDictionaryMatchIndex,
  enrichFlashcardsWithDictionaryLinks,
  findFlashcardDecksForDictionaryEntry,
  type DictionaryFlashcardDeckLink,
  type FlashcardWithDictionaryLink,
} from "@/lib/life-lab/flashcard-dictionary-link";
import type { LifeLabFlashcard } from "@/lib/life-lab/constants";

export type LearningDictionaryBrowseData = {
  availability: LifeLabAvailability;
  cards: DictionaryCardModel[];
  notes: LifeLabNoteSummary[];
  entryCount: number;
};

export type LearningDictionaryEntryData = {
  availability: LifeLabAvailability;
  entry: DictionaryEntryModel | null;
  relatedFlashcardDecks: DictionaryFlashcardDeckLink[];
};

export async function getLearningDictionaryBrowseData(
  filters: DictionaryBrowseFilters = DEFAULT_DICTIONARY_BROWSE_FILTERS,
): Promise<LearningDictionaryBrowseData> {
  const sectionData = await getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID);
  const cards = collectDictionaryBrowseCards(sectionData.notes, filters);

  return {
    availability: sectionData.availability,
    cards,
    notes: sectionData.notes,
    entryCount: cards.length,
  };
}

export async function getDictionaryMatchIndexForFlashcards() {
  const sectionData = await getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID);
  return buildDictionaryMatchIndex(sectionData.notes);
}

export async function enrichFlashcardsWithLearningDictionary(
  cards: LifeLabFlashcard[],
): Promise<FlashcardWithDictionaryLink[]> {
  if (cards.length === 0) {
    return [];
  }

  const index = await getDictionaryMatchIndexForFlashcards();
  return enrichFlashcardsWithDictionaryLinks(cards, index);
}

export async function getLearningDictionaryEntryData(
  slug: string,
): Promise<LearningDictionaryEntryData> {
  const [noteResult, sectionData, flashcardDecks] = await Promise.all([
    getLifeLabNoteData(LEARNING_DICTIONARY_SECTION_ID, slug),
    getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID),
    getLifeLabFlashcardDecksData(),
  ]);

  if (!noteResult.note) {
    return {
      availability: noteResult.availability,
      entry: null,
      relatedFlashcardDecks: [],
    };
  }

  const relatedFlashcardDecks = findFlashcardDecksForDictionaryEntry({
    decks: flashcardDecks.decks,
    entry: {
      slug: noteResult.note.slug,
      title: noteResult.note.title,
      metadata: noteResult.note.metadata,
    },
  });

  return {
    availability: noteResult.availability,
    entry: buildDictionaryEntryModel(noteResult.note, sectionData.notes),
    relatedFlashcardDecks,
  };
}
