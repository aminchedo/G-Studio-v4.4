import React, { useState, useEffect } from 'react';
import { Bug, Mic, Activity, BarChart3, TrendingUp, X } from 'lucide-react';
import { DeepAuditIcon, RefactorIcon, OptimizeIcon, ScanIcon } from '@/components/icons';
import { RibbonGroup, RibbonDivider, RibbonButton } from './RibbonComponents';

interface RibbonIntelligenceTabProps {
  isExpanded: boolean;
  onTriggerTool: (action: string) => void;
  isListening?: boolean;
  onToggleListening?: () => void;
  onShowSpeechTest?: () => void;
  agentConfig?: { apiKey: string, voice: string, persona: string };
  onOpenCodeIntelligence?: () => void;
  onShowRibbonModal?: (modalName: string) => void;
}

export const RibbonIntelligenceTab: React.FC<RibbonIntelligenceTabProps> = ({
  isExpanded,
  onTriggerTool,
  isListening,
  onToggleListening,
  onShowSpeechTest,
  agentConfig,
  onOpenCodeIntelligence,
  onShowRibbonModal
}) => {

  // Ensure all handlers have fallbacks
  const handleTriggerTool = (action: string) => {
    if (onTriggerTool) {
      onTriggerTool(action);
    } else {
      console.warn(`onTriggerTool not provided for action: ${action}`);
    }
  };

  const handleOpenCodeIntelligence = () => {
    if (onOpenCodeIntelligence) {
      onOpenCodeIntelligence();
    } else {
      console.warn('onOpenCodeIntelligence not provided');
    }
  };

  const handleToggleListening = () => {
    if (onToggleListening) {
      onToggleListening();
    } else {
      console.warn('onToggleListening not provided');
    }
  };

  const handleShowSpeechTest = () => {
    if (onShowSpeechTest) {
      onShowSpeechTest();
    } else {
      console.warn('onShowSpeechTest not provided');
    }
  };

  return (
    <div className="flex items-center h-full animate-fade-in gap-10">
      <RibbonGroup label="Analysis" isExpanded={isExpanded}>
        <RibbonButton icon={Activity} label="Code Intel" onClick={handleOpenCodeIntelligence} color="text-indigo-600" isExpanded={isExpanded} inactive={!onOpenCodeIntelligence} />
        <RibbonButton icon={ScanIcon} label="Overview" onClick={() => handleTriggerTool('overview')} color="text-ocean-700" isExpanded={isExpanded} inactive={!onTriggerTool} />
        <RibbonButton icon={DeepAuditIcon} label="Deep Audit" onClick={() => handleTriggerTool('analyze')} color="text-emerald-600" isExpanded={isExpanded} inactive={!onTriggerTool} />
        {isExpanded && (
          <RibbonButton 
            icon={BarChart3} 
            label="Metrics" 
            onClick={() => onShowRibbonModal?.('codeMetrics')} 
            color="text-purple-600" 
            isExpanded={isExpanded} 
            inactive={false} 
          />
        )}
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Refactoring" isExpanded={isExpanded}>
        <RibbonButton icon={Bug} label="Debug" onClick={() => handleTriggerTool('bugs')} color="text-burgundy-700" isExpanded={isExpanded} inactive={!onTriggerTool} />
        <RibbonButton icon={RefactorIcon} label="Refactor" onClick={() => handleTriggerTool('refactor')} color="text-ocean-600" isExpanded={isExpanded} inactive={!onTriggerTool} />
        <RibbonButton icon={OptimizeIcon} label="Optimize" onClick={() => handleTriggerTool('optimize')} color="text-amber-500" isExpanded={isExpanded} inactive={!onTriggerTool} />
      </RibbonGroup>
      <RibbonDivider />
       <RibbonGroup label="Input" isExpanded={isExpanded}>
         <RibbonButton 
           icon={Mic} 
           label={isListening ? "Listening" : "Voice Cmd"} 
           onClick={handleToggleListening} 
           color={isListening ? "text-burgundy-600 animate-pulse" : agentConfig?.apiKey ? "text-emerald-600" : "text-slate-400"} 
           active={isListening || (agentConfig?.apiKey && !isListening)}
           isExpanded={isExpanded}
           inactive={!agentConfig?.apiKey || !onToggleListening}
           title={!agentConfig?.apiKey ? "Please set API key in Settings first" : isListening ? "Stop listening" : "Start voice command (auto-send) - Ready"}
         />
         {onShowSpeechTest && (
           <RibbonButton 
             icon={Mic} 
             label="Speech Test" 
             onClick={handleShowSpeechTest} 
             color="text-ocean-600"
             isExpanded={isExpanded}
             inactive={false}
           />
         )}
      </RibbonGroup>

    </div>
  );
};
