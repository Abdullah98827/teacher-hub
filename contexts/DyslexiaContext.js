import React, { createContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DyslexiaContext = createContext({
  dyslexiaMode: false,
  setDyslexiaMode: (value) => {},
});

export const DyslexiaProvider = ({ children }) => {
  const [dyslexiaMode, setDyslexiaModeState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('dyslexiaMode').then((value) => {
      if (value === 'true') {
        setDyslexiaModeState(true);
      } else {
        setDyslexiaModeState(false);
      }
    });
  }, []);

  const setDyslexiaMode = (value) => {
    if (value === true) {
      setDyslexiaModeState(true);
      AsyncStorage.setItem('dyslexiaMode', 'true');
    } else {
      setDyslexiaModeState(false);
      AsyncStorage.setItem('dyslexiaMode', 'false');
    }
  };

  return (
    <DyslexiaContext.Provider value={{ dyslexiaMode, setDyslexiaMode }}>
      {children}
    </DyslexiaContext.Provider>
  );
};
