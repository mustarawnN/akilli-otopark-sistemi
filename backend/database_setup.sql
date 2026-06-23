USE AkilliOtoparkDB;
GO

IF OBJECT_ID('GirisCikisKayitlari', 'U') IS NOT NULL DROP TABLE GirisCikisKayitlari;
IF OBJECT_ID('ParkYerleri', 'U') IS NOT NULL DROP TABLE ParkYerleri;
IF OBJECT_ID('Kullanicilar', 'U') IS NOT NULL DROP TABLE Kullanicilar;
GO

CREATE TABLE Kullanicilar (
    KullaniciID INT PRIMARY KEY IDENTITY(1,1),
    KullaniciAdi VARCHAR(50) NOT NULL UNIQUE,
    SifreHash VARCHAR(255) NOT NULL,
    Rol VARCHAR(20) NOT NULL DEFAULT 'Operator',
    OlusturulmaTarihi DATETIME DEFAULT GETDATE()
);
GO

CREATE TABLE ParkYerleri (
    ParkYeriID INT PRIMARY KEY IDENTITY(1,1),
    ParkYeriAdi VARCHAR(10) NOT NULL UNIQUE,
    DoluMu BIT NOT NULL DEFAULT 0,           
    MevcutBiletNo VARCHAR(20) NULL,          
    SonGuncelleme DATETIME DEFAULT GETDATE()
);
GO

CREATE TABLE GirisCikisKayitlari (
    KayitID INT PRIMARY KEY IDENTITY(1,1),
    ParkYeriID INT FOREIGN KEY REFERENCES ParkYerleri(ParkYeriID), 
    BiletNo VARCHAR(20) NOT NULL,            
    GirisSaati DATETIME NOT NULL DEFAULT GETDATE(),
    CikisSaati DATETIME NULL,                
    ToplamUcret DECIMAL(10,2) NULL           
);
GO

INSERT INTO ParkYerleri (ParkYeriAdi) VALUES 
('A1'), ('A2'), ('A3'), ('A4'), ('A5'),
('B1'), ('B2'), ('B3'), ('B4'), ('B5');
GO

INSERT INTO Kullanicilar (KullaniciAdi, SifreHash, Rol) 
VALUES ('admin', '123456', 'Admin');
GO

PRINT 'AkilliOtoparkDB veri tabani basariyla olusturuldu!';
