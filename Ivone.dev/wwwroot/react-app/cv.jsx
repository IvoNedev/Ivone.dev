import React from 'react';
import Header from './components/ui/CV/Header';
import Skills from './components/ui/CV/Skills';
import Experience from './components/ui/CV/Experience';
import Projects from './components/ui/CV/Projects';
import Education from './components/ui/CV/Education';

const CVApp = () => {
    return (
        <div className="cv">
            <Header />
            <div className="cv-wrap">
                <div className="main-section">
                    <Skills />
                    <Experience />
                    <Projects />
                    <Education />
                </div>
            </div>
        </div>
    );
};

export default CVApp;
