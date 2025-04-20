import { supabase } from './supabase';
import { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export async function signUp(email: string, password: string, fullName: string) {
  try {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        events_joined: 0,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw new Error('Failed to create profile');
    }

    // Verify profile was created
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select()
      .eq('id', authData.user.id)
      .single();

    if (verifyError || !profile) {
      throw new Error('Failed to verify profile creation');
    }

    return authData;
  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred during signup');
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('Invalid email or password');
      }
      throw error;
    }

    if (!data.user) {
      throw new Error('No user data returned');
    }

    // Verify profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select()
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error('Error fetching profile');
    }

    if (!profile) {
      // Create profile if it doesn't exist
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: data.user.user_metadata.full_name || 'User',
          events_joined: 0,
        });

      if (createError) {
        throw new Error('Failed to create profile');
      }
    }

    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred during sign in');
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred during sign out');
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching profile');
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while updating profile');
  }
}