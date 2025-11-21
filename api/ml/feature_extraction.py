"""
Feature extraction for screening test anomaly detection.

Extracts behavioral and temporal features from ScreeningSession and related data
to detect suspicious patterns like:
- Rushed responses (too fast)
- Bot-like uniform timing
- Inconsistent answer patterns
- Suspicious navigation patterns
"""

import numpy as np
from datetime import datetime
from typing import Dict, List, Optional


class ScreeningFeatureExtractor:
    """
    Extracts features from ScreeningSession for anomaly detection.
    
    Features extracted:
    1. Timing features (7): Response times, uniformity, outliers
    2. Behavioral features (5): Answer patterns, consistency
    3. Navigation features (3): Event patterns, progression
    
    Total: 15 features
    """
    
    def __init__(self):
        self.feature_names = [
            # Timing features (7)
            'avg_response_time_sec',
            'std_response_time_sec',
            'min_response_time_sec',
            'max_response_time_sec',
            'cv_response_time',  # Coefficient of variation
            'pct_too_fast',      # % responses < 2 seconds
            'pct_too_slow',      # % responses > 300 seconds
            
            # Behavioral features (5)
            'health_check_sum',        # Number of health exclusions checked
            'definition_score',        # Numerical encoding of definition answer
            'type_selection_count',    # Number of synesthesia types selected
            'type_selection_diversity', # Diversity of frequency responses
            'consent_timing_sec',      # Time to give consent
            
            # Navigation features (3)
            'event_count',             # Total number of events logged
            'back_navigation_count',   # Number of backward navigations
            'step_completion_rate',    # Proportion of steps completed
        ]
    
    def extract(self, session_data: Dict) -> np.ndarray:
        """
        Extract features from a ScreeningSession and related data.
        
        Args:
            session_data: Dictionary containing:
                - session: ScreeningSession object
                - health: ScreeningHealth object
                - definition: ScreeningDefinition object
                - pain_emotion: ScreeningPainEmotion object
                - type_choice: ScreeningTypeChoice object
                - events: List[ScreeningEvent]
        
        Returns:
            numpy array of 15 features
        """
        features = []
        
        # Extract timing features
        features.extend(self._extract_timing_features(
            session_data.get('events', []),
            session_data.get('session')
        ))
        
        # Extract behavioral features
        features.extend(self._extract_behavioral_features(
            session_data.get('health'),
            session_data.get('definition'),
            session_data.get('type_choice'),
            session_data.get('events', [])
        ))
        
        # Extract navigation features
        features.extend(self._extract_navigation_features(
            session_data.get('events', []),
            session_data.get('session')
        ))
        
        return np.array(features, dtype=np.float32)
    
    def _extract_timing_features(self, events: List, session) -> List[float]:
        """Extract timing-related features from events."""
        if not events:
            # Default values if no events
            return [30.0, 15.0, 5.0, 120.0, 0.5, 0.0, 0.0]
        
        # Calculate response times between consecutive events
        response_times = []
        for i in range(1, len(events)):
            delta = (events[i].created_at - events[i-1].created_at).total_seconds()
            response_times.append(delta)
        
        if not response_times:
            response_times = [30.0]  # Default
        
        avg_rt = np.mean(response_times)
        std_rt = np.std(response_times) if len(response_times) > 1 else 0.0
        min_rt = np.min(response_times)
        max_rt = np.max(response_times)
        
        # Coefficient of variation (normalized std)
        cv_rt = (std_rt / avg_rt) if avg_rt > 0 else 0.0
        
        # Percentage too fast (< 2 seconds - likely bot/rushed)
        pct_too_fast = sum(1 for rt in response_times if rt < 2.0) / len(response_times)
        
        # Percentage too slow (> 300 seconds - distracted/abandoned)
        pct_too_slow = sum(1 for rt in response_times if rt > 300.0) / len(response_times)
        
        return [
            float(avg_rt),
            float(std_rt),
            float(min_rt),
            float(max_rt),
            float(cv_rt),
            float(pct_too_fast),
            float(pct_too_slow)
        ]
    
    def _extract_behavioral_features(
        self, 
        health, 
        definition, 
        type_choice, 
        events: List
    ) -> List[float]:
        """Extract behavioral pattern features."""
        
        # Health check sum (0-3: how many exclusions checked)
        health_sum = 0
        if health:
            health_sum = sum([
                1 if health.drug_use else 0,
                1 if health.neuro_condition else 0,
                1 if health.medical_treatment else 0
            ])
        
        # Definition score (0=no, 1=maybe, 2=yes)
        def_score = 0.0
        if definition:
            if definition.answer.value == 'no':
                def_score = 0.0
            elif definition.answer.value == 'maybe':
                def_score = 1.0
            elif definition.answer.value == 'yes':
                def_score = 2.0
        
        # Type selection count and diversity
        type_count = 0
        type_diversity = 0.0
        if type_choice:
            # Count how many types selected
            types_selected = [
                type_choice.grapheme,
                type_choice.music,
                type_choice.lexical,
                type_choice.sequence
            ]
            type_count = sum(1 for t in types_selected if t is not None)
            
            # Diversity: how varied are the frequency responses?
            # (all "yes" = low diversity, mix of yes/sometimes/no = high)
            if type_count > 0:
                freq_values = [t.value for t in types_selected if t is not None]
                unique_values = len(set(freq_values))
                type_diversity = unique_values / type_count
        
        # Consent timing (time between start and first consent event)
        consent_timing = 30.0  # Default
        if events:
            consent_events = [e for e in events if e.event == 'consent_checked']
            if consent_events and events[0].created_at:
                delta = (consent_events[0].created_at - events[0].created_at).total_seconds()
                consent_timing = float(delta)
        
        return [
            float(health_sum),
            float(def_score),
            float(type_count),
            float(type_diversity),
            float(consent_timing)
        ]
    
    def _extract_navigation_features(self, events: List, session) -> List[float]:
        """Extract navigation pattern features."""
        
        # Event count
        event_count = len(events)
        
        # Back navigation count (suspicious if navigating back repeatedly)
        back_nav_count = sum(1 for e in events if 'back' in e.event.lower())
        
        # Step completion rate
        # Normal flow: steps 0->1->2->3->4->5
        completion_rate = 0.0
        if session:
            if session.status == 'completed':
                completion_rate = 1.0
            elif session.status == 'exited':
                # Estimate based on events
                max_step = max([e.step for e in events], default=0)
                completion_rate = max_step / 5.0  # 5 total steps
        
        return [
            float(event_count),
            float(back_nav_count),
            float(completion_rate)
        ]
    
    def get_feature_names(self) -> List[str]:
        """Return list of feature names for interpretability."""
        return self.feature_names



