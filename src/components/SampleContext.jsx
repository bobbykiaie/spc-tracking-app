import React, { createContext, useState, useEffect } from 'react';

export const SampleContext = createContext();

export const SampleProvider = ({ children }) => {
    const [selectedSample, setSelectedSample] = useState(() => {
        return parseInt(localStorage.getItem('selectedSample')) || 1;
    });

    useEffect(() => {
        localStorage.setItem('selectedSample', selectedSample);
    }, [selectedSample]);

    return (
        <SampleContext.Provider value={{ selectedSample, setSelectedSample }}>
            {children}
        </SampleContext.Provider>
    );
};