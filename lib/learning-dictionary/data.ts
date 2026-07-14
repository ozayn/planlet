import type { LifeLabAvailability, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
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

export type LearningDictionaryBrowseData = {
  availability: LifeLabAvailability;
  cards: DictionaryCardModel[];
  notes: LifeLabNoteSummary[];
  entryCount: number;
};

export type LearningDictionaryEntryData = {
  availability: LifeLabAvailability;
  entry: DictionaryEntryModel | null;
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

export async function getLearningDictionaryEntryData(
  slug: string,
): Promise<LearningDictionaryEntryData> {
  const [noteResult, sectionData] = await Promise.all([
    getLifeLabNoteData(LEARNING_DICTIONARY_SECTION_ID, slug),
    getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID),
  ]);

  if (!noteResult.note) {
    return {
      availability: noteResult.availability,
      entry: null,
    };
  }

  return {
    availability: noteResult.availability,
    entry: buildDictionaryEntryModel(noteResult.note, sectionData.notes),
  };
}
