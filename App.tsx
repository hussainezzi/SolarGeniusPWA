import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { 
  isAiAvailable,
  generateComponentAnalysis,
  generateRenderings,
  generateBillOfMaterials,
  generateOrderSheet
} from './services/geminiService';
import { 
  SystemRequirements, 
  BillOfMaterialItem, 
  SitePhoto,
  LoadingStates,
  ErrorStates,
  StepKey
} from './types';

// --- HELPER & UI COMPONENTS (defined outside App to prevent re-creation) ---

const CheckmarkIcon = () => (
  <svg className="w-6 h-6 text-lime-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-lime-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// --- WORKFLOW ICONS ---
const WorkflowIcon = ({ children }: { children: React.ReactNode }) => <div className="w-8 h-8">{children}</div>;
const InputIcon = () => <WorkflowIcon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg></WorkflowIcon>;
const AnalysisIcon = () => <WorkflowIcon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.455-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.197a3.375 3.375 0 002.456 2.455L20.25 18l-1.197.398a3.375 3.375 0 00-2.456 2.455z" /></svg></WorkflowIcon>;
const RenderingIcon = () => <WorkflowIcon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M12 2.25V4.5m0 16.875a5.25 5.25 0 005.25-5.25V7.5a5.25 5.25 0 00-5.25-5.25h0a5.25 5.25 0 00-5.25 5.25v6.75a5.25 5.25 0 005.25 5.25z" /></svg></WorkflowIcon>;
const BillIcon = () => <WorkflowIcon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C6.343 4.01 5.5 4.965 5.5 6.108v9.642c0 1.266.843 2.34 2.003 2.459a48.42 48.42 0 001.123.08m5.801 0c.065-.21.1-.433.1-.664 0-.414-.336-.75-.75-.75h-4.5a.75.75 0 00-.75.75 2.25 2.25 0 00.1.664m5.8 0A2.251 2.251 0 0113.5 18H12a2.25 2.25 0 01-2.25-2.25V6.108c0-1.266.843-2.34 2.003-2.459a48.42 48.42 0 001.123-.08m-5.801 0c-.376-.023-.75-.05-1.124-.08C8.658 3.668 7.812 3 7 3s-1.658.668-2.15 1.586m12.15 0c.376.023.75.05 1.124.08 1.16.118 2.003 1.193 2.003 2.459v9.642c0 1.266-.843 2.34-2.003 2.459a48.42 48.42 0 00-1.123.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75-.05-1.124.08C6.343 4.01 5.5 4.965 5.5 6.108v9.642c0 1.266.843 2.34 2.003 2.459a48.42 48.42 0 001.123.08m5.801 0c.065-.21.1-.433.1-.664 0-.414-.336-.75-.75-.75h-4.5a.75.75 0 00-.75.75 2.25 2.25 0 00.1.664" /></svg></WorkflowIcon>;
const OrderIcon = () => <WorkflowIcon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></WorkflowIcon>;

const workflowSteps: { key: StepKey | 'inputs'; title: string; icon: React.FC }[] = [
  { key: 'inputs', title: 'Inputs', icon: InputIcon },
  { key: 'analysis', title: 'Analysis', icon: AnalysisIcon },
  { key: 'renderings', title: 'Renderings', icon: RenderingIcon },
  { key: 'billOfMaterials', title: 'Bill of Materials', icon: BillIcon },
  { key: 'orderSheet', title: 'Order Sheet', icon: OrderIcon },
];

const WorkflowDiagram: React.FC<{ successStates: Record<StepKey, boolean>, inputComplete: boolean }> = ({ successStates, inputComplete }) => {
  const getIsComplete = (key: StepKey | 'inputs') => {
    if (key === 'inputs') return inputComplete;
    return successStates[key];
  };

  return (
    <div className="flex items-center justify-center">
      {workflowSteps.map((step, index) => {
        const isComplete = getIsComplete(step.key);
        const isLast = index === workflowSteps.length - 1;
        const Icon = step.icon;
        
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center text-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${isComplete ? 'border-lime-green bg-lime-green/20 text-lime-green' : 'border-slate-border bg-slate-light text-gray-400'}`}>
                <Icon />
              </div>
              <p className={`mt-2 text-xs font-bold transition-all duration-300 ${isComplete ? 'text-lime-green' : 'text-gray-400'}`}>{step.title}</p>
            </div>
            {!isLast && <div className={`flex-1 h-0.5 transition-all duration-500 mx-2 ${isComplete ? 'bg-lime-green' : 'bg-slate-border'}`}></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

interface StepCardProps {
  title: string;
  description: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  onGenerate: () => void;
  isAiOnline: boolean;
  isButtonDisabled: boolean;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ title, description, status, onGenerate, isAiOnline, isButtonDisabled, children }) => (
  <div className="bg-slate-light rounded-lg p-4 flex flex-col h-full border border-slate-border">
    <div className="flex justify-between items-start mb-2">
      <div>
        <h3 className="font-bold text-lg text-lime-green">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <div className="flex-shrink-0">
        {status === 'loading' && <Spinner />}
        {status === 'success' && <CheckmarkIcon />}
        {status === 'error' && <ErrorIcon />}
      </div>
    </div>
    <div className="flex-grow my-4 overflow-y-auto pr-2">
      {children}
    </div>
    {isAiOnline && (
      <button
        onClick={onGenerate}
        disabled={isButtonDisabled || status === 'loading'}
        className="mt-auto w-full bg-lime-green text-slate-gray font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-white disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Generating...' : 'Generate'}
      </button>
    )}
  </div>
);

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [isAiOnline, setIsAiOnline] = useState<boolean>(false);
  
  // Inputs
  const [sitePhotos, setSitePhotos] = useState<SitePhoto[]>([]);
  const [requirements, setRequirements] = useState<SystemRequirements>({
    desiredKw: '10',
    batteryKwh: '15',
    panelType: 'monocrystalline',
    inverterType: 'hybrid',
    additionalNotes: 'South-facing asphalt shingle roof, two stories.',
  });

  // AI-Generated Outputs & Manual Fallbacks
  const [compatibleComponents, setCompatibleComponents] = useState<string>('');
  const [generatedRenderings, setGeneratedRenderings] = useState<string[]>([]);
  const [billOfMaterials, setBillOfMaterials] = useState<BillOfMaterialItem[]>([]);
  const [orderSheet, setOrderSheet] = useState<string>('');

  // UI State
  const [loading, setLoading] = useState<LoadingStates>({ analysis: false, renderings: false, billOfMaterials: false, orderSheet: false });
  const [errors, setErrors] = useState<ErrorStates>({ analysis: null, renderings: null, billOfMaterials: null, orderSheet: null });
  const [success, setSuccess] = useState<Record<StepKey, boolean>>({ analysis: false, renderings: false, billOfMaterials: false, orderSheet: false });
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setIsAiOnline(isAiAvailable());
  }, []);

  const handleRequirementChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRequirements(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const photoPromises = files.map(file => {
        return new Promise<SitePhoto>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ file, base64, name: file.name });
          };
          reader.onerror = error => reject(error);
        });
      });
      const newPhotos = await Promise.all(photoPromises);
      setSitePhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const executeAiStep = useCallback(async <T,>(
    step: StepKey,
    action: () => Promise<T>,
    onSuccess: (result: T) => void
  ) => {
    setLoading(prev => ({ ...prev, [step]: true }));
    setErrors(prev => ({ ...prev, [step]: null }));
    setSuccess(prev => ({ ...prev, [step]: false }));
    try {
      const result = await action();
      onSuccess(result);
      setSuccess(prev => ({ ...prev, [step]: true }));
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [step]: e.message || `An error occurred during ${step}.` }));
    } finally {
      setLoading(prev => ({ ...prev, [step]: false }));
    }
  }, []);

  const getStatus = (step: StepKey): 'idle' | 'loading' | 'success' | 'error' => {
    if (loading[step]) return 'loading';
    if (errors[step]) return 'error';
    if (success[step]) return 'success';
    return 'idle';
  };

  const handleCopyOrderSheet = () => {
    navigator.clipboard.writeText(orderSheet).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderBillOfMaterialsTable = () => (
    <div className="text-sm font-mono">
      <table className="w-full text-left">
        <thead className="text-lime-green">
          <tr><th className="p-1">Item</th><th className="p-1">Qty</th><th className="p-1">Vendor</th></tr>
        </thead>
        <tbody>
          {billOfMaterials.map((item, index) => (
            <tr key={index} className="border-t border-slate-border">
              <td className="p-1">{item.item}</td><td className="p-1">{item.quantity}</td><td className="p-1">{item.vendor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  const handleManualBomChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textValue = e.target.value;
    try {
        const parsed = JSON.parse(textValue);
        if (Array.isArray(parsed)) {
            setBillOfMaterials(parsed);
            setErrors(prev => ({...prev, billOfMaterials: null}));
        } else {
            setErrors(prev => ({...prev, billOfMaterials: "Invalid format. Must be a JSON array."}));
        }
    } catch (err) {
        setErrors(prev => ({...prev, billOfMaterials: "Invalid JSON format."}));
    }
};

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-border">
        <h1 className="text-3xl font-bold">SolarGenius<span className="text-lime-green">PWA</span></h1>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-bold ${isAiOnline ? 'bg-teal-selected' : 'bg-red-900'}`}>
          <span className={`w-2 h-2 rounded-full ${isAiOnline ? 'bg-lime-green' : 'bg-red-400'}`}></span>
          <span>AI Status: {isAiOnline ? 'Online' : 'Offline'}</span>
        </div>
      </header>
      {!isAiOnline && (
        <div className="bg-yellow-900 border border-yellow-400 text-yellow-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">AI Features Unavailable.</strong>
          <span className="block sm:inline"> Gemini API key is not configured. You can still use the app for manual data entry.</span>
        </div>
      )}

      <section className="my-8 p-6 bg-slate-light rounded-lg border border-slate-border">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-200">Project Workflow</h2>
        <WorkflowDiagram successStates={success} inputComplete={sitePhotos.length > 0} />
      </section>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUTS COLUMN */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-light p-4 rounded-lg border border-slate-border">
                <h2 className="text-xl font-bold mb-4 text-lime-green border-b border-slate-border pb-2">1. Site & System Inputs</h2>
                {/* File Upload */}
                <div>
                    <label className="block text-sm font-bold mb-2">Site Survey Photos</label>
                    <input type="file" multiple onChange={handlePhotoUpload} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-green file:text-slate-gray hover:file:bg-white"/>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {sitePhotos.map(p => <div key={p.name} className="relative"><img src={`data:${p.file.type};base64,${p.base64}`} alt={p.name} className="rounded-md object-cover h-24 w-full" /><div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate w-full">{p.name}</div></div>)}
                    </div>
                </div>
                 {/* System Requirements */}
                <div className="space-y-3 mt-4">
                    <label className="block text-sm font-bold">System Requirements</label>
                    <div className="grid grid-cols-2 gap-3">
                        <input name="desiredKw" value={requirements.desiredKw} onChange={handleRequirementChange} placeholder="Desired kW" className="w-full bg-slate-gray p-2 rounded-md border border-slate-border focus:ring-2 focus:ring-lime-green focus:outline-none" />
                        <input name="batteryKwh" value={requirements.batteryKwh} onChange={handleRequirementChange} placeholder="Battery kWh" className="w-full bg-slate-gray p-2 rounded-md border border-slate-border focus:ring-2 focus:ring-lime-green focus:outline-none" />
                    </div>
                    <select name="panelType" value={requirements.panelType} onChange={handleRequirementChange} className="w-full bg-slate-gray p-2 rounded-md border border-slate-border focus:ring-2 focus:ring-lime-green focus:outline-none">
                        <option value="monocrystalline">Monocrystalline Panels</option>
                        <option value="polycrystalline">Polycrystalline Panels</option>
                        <option value="thin-film">Thin-Film Panels</option>
                    </select>
                     <select name="inverterType" value={requirements.inverterType} onChange={handleRequirementChange} className="w-full bg-slate-gray p-2 rounded-md border border-slate-border focus:ring-2 focus:ring-lime-green focus:outline-none">
                        <option value="string">String Inverter</option>
                        <option value="micro">Micro Inverters</option>
                        <option value="hybrid">Hybrid Inverter</option>
                    </select>
                    <textarea name="additionalNotes" value={requirements.additionalNotes} onChange={handleRequirementChange} placeholder="Additional Notes..." rows={3} className="w-full bg-slate-gray p-2 rounded-md border border-slate-border focus:ring-2 focus:ring-lime-green focus:outline-none font-mono text-sm"></textarea>
                </div>
            </div>
        </div>

        {/* AI STEPS GRID */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <StepCard title="1. Component Compatibility" description="AI analyzes requirements for compatible hardware." status={getStatus('analysis')} onGenerate={() => executeAiStep('analysis', () => generateComponentAnalysis(requirements), setCompatibleComponents)} isAiOnline={isAiOnline} isButtonDisabled={!requirements.desiredKw}>
            {errors.analysis && <p className="text-red-400 text-sm">{errors.analysis}</p>}
            <textarea readOnly={isAiOnline} value={compatibleComponents} onChange={(e) => setCompatibleComponents(e.target.value)} className="w-full h-full bg-slate-gray p-2 rounded-md border border-slate-border font-mono text-sm focus:ring-2 focus:ring-lime-green focus:outline-none" placeholder={isAiOnline ? "Generated component list will appear here..." : "Manually enter component list..."}></textarea>
          </StepCard>

          <StepCard title="2. 3D Renderings" description="AI generates visualizations on site photos." status={getStatus('renderings')} onGenerate={() => executeAiStep('renderings', () => generateRenderings(compatibleComponents, sitePhotos), setGeneratedRenderings)} isAiOnline={isAiOnline} isButtonDisabled={!compatibleComponents || sitePhotos.length === 0}>
             {errors.renderings && <p className="text-red-400 text-sm">{errors.renderings}</p>}
             <div className="grid grid-cols-2 gap-2">
                {(generatedRenderings.length > 0 ? generatedRenderings : sitePhotos.map(p => `data:${p.file.type};base64,${p.base64}`)).map((src, i) => <img key={i} src={src} alt={`Rendering ${i+1}`} className="rounded-md object-cover w-full h-auto"/>)}
             </div>
             {!isAiOnline && <p className="text-xs text-gray-400 mt-2">In manual mode, this section displays uploaded site photos.</p>}
          </StepCard>

          <StepCard title="3. Bill of Materials" description="AI creates an itemized materials list." status={getStatus('billOfMaterials')} onGenerate={() => executeAiStep('billOfMaterials', () => generateBillOfMaterials(compatibleComponents, sitePhotos), setBillOfMaterials)} isAiOnline={isAiOnline} isButtonDisabled={!success.renderings}>
            {errors.billOfMaterials && <p className="text-red-400 text-sm">{errors.billOfMaterials}</p>}
            {isAiOnline ? (billOfMaterials.length > 0 && renderBillOfMaterialsTable()) : 
                <textarea onChange={handleManualBomChange} defaultValue={JSON.stringify(billOfMaterials, null, 2)} className="w-full h-full bg-slate-gray p-2 rounded-md border border-slate-border font-mono text-sm focus:ring-2 focus:ring-lime-green focus:outline-none" placeholder="Manually paste Bill of Materials JSON here..."></textarea>}
            {!isAiOnline && <p className="text-xs text-gray-400 mt-2">Enter a valid JSON array of material items.</p>}
          </StepCard>

          <StepCard title="4. Order Sheet" description="AI compiles a final purchase order." status={getStatus('orderSheet')} onGenerate={() => executeAiStep('orderSheet', () => generateOrderSheet(billOfMaterials), setOrderSheet)} isAiOnline={isAiOnline} isButtonDisabled={billOfMaterials.length === 0}>
            {errors.orderSheet && <p className="text-red-400 text-sm">{errors.orderSheet}</p>}
            <div className="relative h-full">
                <textarea readOnly={isAiOnline} value={orderSheet} onChange={(e) => setOrderSheet(e.target.value)} className="w-full h-full bg-slate-gray p-2 rounded-md border border-slate-border font-mono text-sm focus:ring-2 focus:ring-lime-green focus:outline-none" placeholder={isAiOnline ? "Generated order sheet will appear here..." : "Manually write order sheet..."}></textarea>
                {orderSheet && <button onClick={handleCopyOrderSheet} className="absolute top-2 right-2 bg-teal-selected text-white px-2 py-1 text-xs rounded hover:bg-lime-green hover:text-slate-gray">{copied ? 'Copied!' : 'Copy'}</button>}
            </div>
          </StepCard>
        </div>
      </main>
    </div>
  );
};

export default App;
