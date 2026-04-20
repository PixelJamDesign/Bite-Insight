/**
 * Edit Recipe — delegates to the builder screen, which reads `id` from
 * useLocalSearchParams and switches into edit mode automatically.
 */
import RecipeBuilderScreen from '@/app/recipes/new';

export default function EditRecipeScreen() {
  return <RecipeBuilderScreen />;
}
